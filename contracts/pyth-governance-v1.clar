(use-trait pyth-proxy-trait .pyth-traits-v1.proxy-trait)
(use-trait pyth-decoder-trait .pyth-traits-v1.decoder-trait)
(use-trait pyth-storage-trait .pyth-traits-v1.storage-trait)
(use-trait wormhole-core-trait .wormhole-traits-v1.core-trait)

;; VAA including some commands for administrating Pyth contract
;; The oracle contract address must be upgraded
(define-constant GOVERNANCE_UPGRADE_CONTRACT 0x)
;; Emit a request for governance change 
(define-constant GOVERNANCE_REQUEST_GOVERNANCE_DATA_SOURCE_TRANSFER 0x)
;; Authorize governance change
(define-constant GOVERNANCE_AUTHORIZE_GOVERNANCE_DATA_SOURCE_TRANSFER 0x)
;; Which wormhole emitter is allowed to send price updates
(define-constant GOVERNANCE_SET_DATA_SOURCE 0x)
;; Fee is charged when you submit a new price
(define-constant GOVERNANCE_SET_FEE 0x)
;; Default amoutn of time considered to be "fresh". Can be ignored
(define-constant GOVERNANCE_SET_VALID_PERIOD 0x)
;; Wormhole contract 
(define-constant GOVERNANCE_SET_WORMHOLE_ADDRESS 0x)

(define-data-var active-data-source-contract-address principal .pyth-data-source-v1)
(define-data-var active-wormhole-core-address principal .wormhole-core-dev-preview-1)
(define-data-var fee-recipient-address principal tx-sender)
(define-data-var fee-value uint u1)

(define-map execution-plans uint { 
  pyth-proxy-contract: principal,
  pyth-decoder-contract: principal, 
  pyth-storage-contract: principal,
  wormhole-core-contract: principal
})
(define-data-var current-execution-plan-id uint u0)

(define-public (charge-fee (num-updates uint))
  (let ((total-fee (* num-updates (var-get fee-value))))
    (unwrap! (stx-transfer? total-fee tx-sender (var-get fee-recipient-address)) (err u0))
    (ok total-fee)))

(define-read-only (check-execution-flow 
  (former-contract-caller principal)
  (execution-plan-opt (optional {
    pyth-storage-contract: <pyth-storage-trait>,
    pyth-decoder-contract: <pyth-decoder-trait>,
    wormhole-core-contract: <wormhole-core-trait>
  })))
  (let ((expected-execution-plan (get-current-execution-plan))
        (success (if (is-eq contract-caller (get pyth-storage-contract expected-execution-plan))
          ;; The storage contract is checking its execution flow
          ;; Must always be invoked by the proxy
          (try! (expect-contract-call-performed-by-expected-proxy-contract former-contract-caller expected-execution-plan))
          ;; Other contract
          (if (is-eq contract-caller (get pyth-decoder-contract expected-execution-plan))
            ;; The decoding contract is checking its execution flow
            (let ((execution-plan (unwrap! execution-plan-opt (err u10))))
              ;; Must always be invoked by the proxy
              (try! (expect-contract-call-performed-by-expected-proxy-contract former-contract-caller expected-execution-plan))
              ;; Ensure that wormhole contract is the one expected
              (try! (expect-active-wormhole-contract (get wormhole-core-contract execution-plan) expected-execution-plan)))
            (if (is-eq contract-caller (get pyth-proxy-contract expected-execution-plan))
              ;; The proxy contract is checking its execution flow
              (let ((execution-plan (unwrap! execution-plan-opt (err u10))))
                ;; This contract must always be invoked by the proxy
                (try! (expect-contract-call-performed-by-expected-proxy-contract former-contract-caller expected-execution-plan))
                ;; Ensure that storage contract is the one expected
                (try! (expect-active-storage-contract (get pyth-storage-contract execution-plan) expected-execution-plan))
                ;; Ensure that decoder contract is the one expected
                (try! (expect-active-decoder-contract (get pyth-decoder-contract execution-plan) expected-execution-plan))
                ;; Ensure that wormhole contract is the one expected
                (try! (expect-active-wormhole-contract (get wormhole-core-contract execution-plan) expected-execution-plan)))
              false)))))
      (if success (ok true) (err u0))))

(define-read-only (check-storage-contract 
  (storage-contract <pyth-storage-trait>))
  (let ((expected-execution-plan (get-current-execution-plan)))
      ;; Ensure that storage contract is the one expected
      (expect-active-storage-contract storage-contract expected-execution-plan)))

(define-private (expect-contract-call-performed-by-expected-proxy-contract 
  (former-contract-caller principal) 
  (expected-plan { 
    pyth-proxy-contract: principal,
    pyth-decoder-contract: principal, 
    pyth-storage-contract: principal,
    wormhole-core-contract: principal
  }))
  (begin
    (asserts! 
      (is-eq former-contract-caller (get pyth-proxy-contract expected-plan))
      (err u0))
    (ok true)))

(define-private (expect-active-storage-contract 
  (storage-contract <pyth-storage-trait>)
  (expected-plan { 
    pyth-proxy-contract: principal,
    pyth-decoder-contract: principal, 
    pyth-storage-contract: principal,
    wormhole-core-contract: principal
  }))
  (begin
    (asserts! 
      (is-eq 
        (contract-of storage-contract) 
        (get pyth-storage-contract expected-plan)) (err u1))
    (ok true)))

(define-private (expect-active-decoder-contract 
  (decoder-contract <pyth-decoder-trait>)
  (expected-plan { 
    pyth-proxy-contract: principal,
    pyth-decoder-contract: principal, 
    pyth-storage-contract: principal,
    wormhole-core-contract: principal
  }))
  (begin
    (asserts! 
      (is-eq 
        (contract-of decoder-contract) 
        (get pyth-decoder-contract expected-plan)) (err u2))
    (ok true)))

(define-private (expect-active-wormhole-contract 
  (wormhole-contract <wormhole-core-trait>)
  (expected-plan { 
    pyth-proxy-contract: principal,
    pyth-decoder-contract: principal, 
    pyth-storage-contract: principal,
    wormhole-core-contract: principal
  }))
  (begin
    (asserts! 
      (is-eq 
        (contract-of wormhole-contract) 
        (get wormhole-core-contract expected-plan)) (err u3))
    (ok true)))

(define-read-only (get-current-execution-plan)
  (unwrap-panic (map-get? execution-plans (var-get current-execution-plan-id))))

;; (define-public (update-fee (update-fee-vaa (buff 2048)))
;;   (let ((vaa (parse-and-verify-vaa guardian-set-vaa)))
;;           (try! (parse-vaa guardian-set-vaa))))
;;         (cursor-guardians-data (try! (parse-and-verify-guardians-set (get payload vaa))))
;;         (set-id (get new-index (get value cursor-guardians-data)))
;;         (eth-addresses (get guardians-eth-addresses (get value cursor-guardians-data)))
;;         (acc (unwrap-panic (as-max-len? (list { 
;;           compressed-public-key: (unwrap-panic (as-max-len? 0x u33)), 
;;           uncompressed-public-key: (unwrap-panic (as-max-len? 0x u64))
;;         }) u20)))
;;         (consolidated-public-keys (fold 
;;           check-and-consolidate-public-keys 
;;           uncompressed-public-keys 
;;           { success: true, cursor: u0, eth-addresses: eth-addresses, result: acc }))
;;         )
;;     ;; Ensure that enough uncompressed-public-keys were provided
;;     (asserts! (is-eq (len uncompressed-public-keys) (len eth-addresses)) 
;;       ERR_GSU_UNCOMPRESSED_PUBLIC_KEYS)
;;     ;; Check guardians uncompressed-public-keys
;;     (asserts! (get success consolidated-public-keys)
;;       ERR_GSU_UNCOMPRESSED_PUBLIC_KEYS)

;;     (map-set guardian-sets { set-id: set-id } 
;;       (unwrap-panic (as-max-len? 
;;         (unwrap-panic (slice? (get result consolidated-public-keys) u1 (len (get result consolidated-public-keys)))) 
;;         u19)))
;;     (var-set active-guardian-set-id set-id)
;;     (var-set guardian-set-initialized true)
;;     (ok {
;;       vaa: vaa,
;;       consolidated-public-keys: consolidated-public-keys,
;;     })))

(begin
  (map-insert execution-plans u0 { 
    pyth-proxy-contract: .pyth-oracle-v1,
    pyth-decoder-contract: .pyth-pnau-decoder-v1, 
    pyth-storage-contract: .pyth-store-v1,
    wormhole-core-contract: .wormhole-core-v1
  }))

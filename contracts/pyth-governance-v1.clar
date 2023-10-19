;; Title: pyth-governance
;; Version: v1
;; Check for latest version: https://github.com/hirosystems/stacks-pyth-bridge#latest-version
;; Report an issue: https://github.com/hirosystems/stacks-pyth-bridge/issues

(use-trait pyth-proxy-trait .pyth-traits-v1.proxy-trait)
(use-trait pyth-decoder-trait .pyth-traits-v1.decoder-trait)
(use-trait pyth-storage-trait .pyth-traits-v1.storage-trait)
(use-trait wormhole-core-trait .wormhole-traits-v1.core-trait)

(define-constant PTGM_MAGIC 0x5054474d) ;; 'PTGM': Pyth Governance Message

;; VAA including some commands for administrating Pyth contract
;; The oracle contract address must be upgraded
(define-constant GOVERNANCE_UPGRADE_CONTRACT_PYTH_ORACLE 0x00)
;; Authorize governance change
(define-constant GOVERNANCE_AUTHORIZE_GOVERNANCE_DATA_SOURCE_TRANSFER 0x01)
;; Which wormhole emitter is allowed to send price updates
(define-constant GOVERNANCE_SET_DATA_SOURCES 0x02)
;; Fee is charged when you submit a new price
(define-constant GOVERNANCE_SET_FEE 0x03)
;; Emit a request for governance change 
(define-constant GOVERNANCE_REQUEST_GOVERNANCE_DATA_SOURCE_TRANSFER 0x05)
;; Wormhole contract 
(define-constant GOVERNANCE_UPGRADE_CONTRACT_WORMHOLE_CORE 0x06)
;; Fee is charged when you submit a new price
(define-constant GOVERNANCE_SET_RECIPIENT_ADDRESS 0xa0)
;; Error unauthorized control flow
(define-constant ERR_UNAUTHORIZED_ACCESS (err u404))


(define-data-var fee-value 
  { mantissa: uint, exponent: uint } 
  { mantissa: u1, exponent: u1 })
(define-data-var price-data-sources (buff 32) 0x)
(define-data-var governance-data-source 
  { emitter-chain: uint, emitter-address: (buff 32) }
  { emitter-chain: u0, emitter-address: 0x })
(define-data-var fee-recipient-address principal tx-sender)

(define-map prices-data-sources uint 
  (list 255 { emitter-chain: uint, emitter-address: (buff 32) }))
(define-data-var current-prices-data-sources-id uint u0)

(define-map execution-plans uint { 
  pyth-oracle-contract: principal,
  pyth-decoder-contract: principal, 
  pyth-storage-contract: principal,
  wormhole-core-contract: principal
})
(define-data-var current-execution-plan-id uint u0)

;; Execution plan management
;; Initialize governance v1 with v1 contracts 
(begin
  (map-insert execution-plans u0 { 
    pyth-oracle-contract: .pyth-oracle-v1,
    pyth-decoder-contract: .pyth-pnau-decoder-v1, 
    pyth-storage-contract: .pyth-store-v1,
    wormhole-core-contract: .wormhole-core-v1
  }))

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
          (try! (expect-contract-call-performed-by-expected-oracle-contract former-contract-caller expected-execution-plan))
          ;; Other contract
          (if (is-eq contract-caller (get pyth-decoder-contract expected-execution-plan))
            ;; The decoding contract is checking its execution flow
            (let ((execution-plan (unwrap! execution-plan-opt ERR_UNAUTHORIZED_ACCESS)))
              ;; Must always be invoked by the proxy
              (try! (expect-contract-call-performed-by-expected-oracle-contract former-contract-caller expected-execution-plan))
              ;; Ensure that wormhole contract is the one expected
              (try! (expect-active-wormhole-contract (get wormhole-core-contract execution-plan) expected-execution-plan)))
            (if (is-eq contract-caller (get pyth-oracle-contract expected-execution-plan))
              ;; The proxy contract is checking its execution flow
              (let ((execution-plan (unwrap! execution-plan-opt ERR_UNAUTHORIZED_ACCESS)))
                ;; This contract must always be invoked by the proxy
                ;; (try! (expect-contract-call-performed-by-expected-oracle-contract former-contract-caller expected-execution-plan))
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

(define-private (expect-contract-call-performed-by-expected-oracle-contract 
  (former-contract-caller principal) 
  (expected-plan { 
    pyth-oracle-contract: principal,
    pyth-decoder-contract: principal, 
    pyth-storage-contract: principal,
    wormhole-core-contract: principal
  }))
  (begin
    (asserts! 
      (is-eq former-contract-caller (get pyth-oracle-contract expected-plan))
      (err u0))
    (ok true)))

(define-private (expect-active-storage-contract 
  (storage-contract <pyth-storage-trait>)
  (expected-plan { 
    pyth-oracle-contract: principal,
    pyth-decoder-contract: principal, 
    pyth-storage-contract: principal,
    wormhole-core-contract: principal
  }))
  (begin
    (asserts! 
      (is-eq 
        (contract-of storage-contract) 
        (get pyth-storage-contract expected-plan)) ERR_UNAUTHORIZED_ACCESS)
    (ok true)))

(define-private (expect-active-decoder-contract 
  (decoder-contract <pyth-decoder-trait>)
  (expected-plan { 
    pyth-oracle-contract: principal,
    pyth-decoder-contract: principal, 
    pyth-storage-contract: principal,
    wormhole-core-contract: principal
  }))
  (begin
    (asserts! 
      (is-eq 
        (contract-of decoder-contract) 
        (get pyth-decoder-contract expected-plan)) ERR_UNAUTHORIZED_ACCESS)
    (ok true)))

(define-private (expect-active-wormhole-contract 
  (wormhole-contract <wormhole-core-trait>)
  (expected-plan { 
    pyth-oracle-contract: principal,
    pyth-decoder-contract: principal, 
    pyth-storage-contract: principal,
    wormhole-core-contract: principal
  }))
  (begin
    (asserts! 
      (is-eq 
        (contract-of wormhole-contract) 
        (get wormhole-core-contract expected-plan)) ERR_UNAUTHORIZED_ACCESS)
    (ok true)))

(define-read-only (get-current-execution-plan)
  (unwrap-panic (map-get? execution-plans (var-get current-execution-plan-id))))

(define-read-only (get-fee-info)
  (merge (var-get fee-value) { address: (var-get fee-recipient-address) }))

(define-public (update-fee-value (vaa-bytes (buff 8192)) (wormhole-core-contract <wormhole-core-trait>))
  (let ((expected-execution-plan (get-current-execution-plan))
        (vaa (try! (contract-call? wormhole-core-contract parse-and-verify-vaa vaa-bytes)))
        (fee-value-update (try! (parse-and-verify-fee-value (get payload vaa)))))
    ;; Ensure that the lastest wormhole contract is used
    (try! (expect-active-wormhole-contract wormhole-core-contract expected-execution-plan))
    ;; 
    (var-set fee-value fee-value-update)
    (ok fee-value-update)))

(define-public (update-fee-recipient-addess (vaa-bytes (buff 8192)) (wormhole-core-contract <wormhole-core-trait>))
  (let ((expected-execution-plan (get-current-execution-plan))
        (vaa (try! (contract-call? wormhole-core-contract parse-and-verify-vaa vaa-bytes)))
        (fee-recipient-address-update (try! (parse-and-verify-fee-recipient-address (get payload vaa)))))
    ;; Ensure that the lastest wormhole contract is used
    (try! (expect-active-wormhole-contract wormhole-core-contract expected-execution-plan))
    ;; 
    (var-set fee-recipient-address fee-recipient-address-update)
    (ok fee-recipient-address-update)))

(define-public (update-wormhole-core-contract (vaa-bytes (buff 8192)) (wormhole-core-contract <wormhole-core-trait>))
  (let ((expected-execution-plan (get-current-execution-plan))
        (next-execution-plan-id (+ (var-get current-execution-plan-id) u1))
        (vaa (try! (contract-call? wormhole-core-contract parse-and-verify-vaa vaa-bytes)))
        (wormhole-core-address (try! (parse-and-verify-wormhole-core-contract (get payload vaa)))))
    ;; Ensure that the lastest wormhole contract is used
    (try! (expect-active-wormhole-contract wormhole-core-contract expected-execution-plan))
    ;; 
    (map-set execution-plans next-execution-plan-id (merge expected-execution-plan { wormhole-core-contract: wormhole-core-address }))
    (ok wormhole-core-address)))

(define-public (update-pyth-oracle-contract (vaa-bytes (buff 8192)) (wormhole-core-contract <wormhole-core-trait>))
  (let ((expected-execution-plan (get-current-execution-plan))
        (next-execution-plan-id (+ (var-get current-execution-plan-id) u1))
        (vaa (try! (contract-call? wormhole-core-contract parse-and-verify-vaa vaa-bytes)))
        (pyth-oracle-address (try! (parse-and-verify-pyth-oracle-contract (get payload vaa)))))
    ;; Ensure that the lastest wormhole contract is used
    (try! (expect-active-wormhole-contract wormhole-core-contract expected-execution-plan))
    ;; 
    (map-set execution-plans next-execution-plan-id (merge expected-execution-plan { pyth-oracle-contract: pyth-oracle-address }))
    (ok pyth-oracle-address)))

(define-public (update-prices-data-sources (vaa-bytes (buff 8192)) (wormhole-core-contract <wormhole-core-trait>))
  (let ((expected-execution-plan (get-current-execution-plan))
        (next-prices-data-sources-id (+ (var-get current-prices-data-sources-id) u1))
        (vaa (try! (contract-call? wormhole-core-contract parse-and-verify-vaa vaa-bytes)))
        (prices-data-sources-update (try! (parse-and-verify-prices-data-sources (get payload vaa)))))
    ;; Ensure that the lastest wormhole contract is used
    (try! (expect-active-wormhole-contract wormhole-core-contract expected-execution-plan))
    ;; 
    (map-set prices-data-sources next-prices-data-sources-id prices-data-sources-update)
    (ok prices-data-sources-update)))


(define-private (parse-and-verify-governance-instruction (ptgm-bytes (buff 8192)))
    (let ((cursor-magic (unwrap! (contract-call? .hk-cursor-v1 read-buff-4 { bytes: ptgm-bytes, pos: u0 }) 
            (err u0)))
          (cursor-module (unwrap! (contract-call? .hk-cursor-v1 read-uint-8 (get next cursor-magic)) 
            (err u1)))
          (cursor-action (unwrap! (contract-call? .hk-cursor-v1 read-buff-1 (get next cursor-module)) 
            (err u2)))
          (cursor-target-chain-id (unwrap! (contract-call? .hk-cursor-v1 read-uint-16 (get next cursor-action)) 
            (err u3))))
        ;; Check magic bytes
        (asserts! (is-eq (get value cursor-magic) PTGM_MAGIC) (err u1))
        ;;
        (ok { 
          action: (get value cursor-action), 
          target-chain-id: (get value cursor-target-chain-id), 
          module: (get value cursor-module),
          cursor: cursor-target-chain-id
        })))

(define-private (parse-and-verify-fee-value (fee-value-bytes (buff 8192)))
  (let ((gi (try! (parse-and-verify-governance-instruction fee-value-bytes))))
      (asserts! (is-eq (get action gi) GOVERNANCE_SET_FEE) (err u1))
      ;; TODO: Check emitter-chain and emitter-address
      (let ((cursor-mantissa (unwrap! (contract-call? .hk-cursor-v1 read-uint-64 (get next (get cursor gi))) 
              (err u100)))
            (cursor-exponent (unwrap! (contract-call? .hk-cursor-v1 read-uint-64 (get next cursor-mantissa)) 
              (err u100))))
    (ok { 
      mantissa: (get value cursor-mantissa), 
      exponent: (get value cursor-exponent) 
    }))))

(define-private (parse-and-verify-fee-recipient-address (fee-recipient-bytes (buff 8192)))
  (let ((gi (try! (parse-and-verify-governance-instruction fee-recipient-bytes))))
      (asserts! (is-eq (get action gi) GOVERNANCE_SET_RECIPIENT_ADDRESS) (err u1))
      ;; TODO: Check emitter-chain and emitter-address
      (let ((cursor-version (unwrap! (contract-call? .hk-cursor-v1 read-buff-1 (get next (get cursor gi))) 
              (err u100)))
            (cursor-hash-bytes (unwrap! (contract-call? .hk-cursor-v1 read-buff-20 (get next cursor-version)) 
              (err u100)))
            (cursor-contract-name (unwrap! (contract-call? .hk-cursor-v1 read-buff-8192-max (get next cursor-hash-bytes) none)
              (err u100)))
            (recipient (unwrap! 
              (if (is-eq u0 (len (get value cursor-contract-name)))
                (principal-construct? 
                  (get value cursor-version) 
                  (get value cursor-hash-bytes))
                (principal-construct? 
                  (get value cursor-version) 
                  (get value cursor-hash-bytes)
                  (unwrap! (from-consensus-buff? (string-ascii 40) (get value cursor-contract-name)) (err u100))))
              (err u100))))
        (ok recipient))))

(define-private (parse-and-verify-wormhole-core-contract (wormhole-core-contract-bytes (buff 8192)))
  (let ((gi (try! (parse-and-verify-governance-instruction wormhole-core-contract-bytes))))
      (asserts! (is-eq (get action gi) GOVERNANCE_UPGRADE_CONTRACT_WORMHOLE_CORE) (err u1))
      ;; TODO: Check emitter-chain and emitter-address
      (let ((cursor-version (unwrap! (contract-call? .hk-cursor-v1 read-buff-1 (get next (get cursor gi))) 
              (err u100)))
            (cursor-hash-bytes (unwrap! (contract-call? .hk-cursor-v1 read-buff-20 (get next cursor-version)) 
              (err u100)))
            (cursor-contract-name (unwrap! (contract-call? .hk-cursor-v1 read-buff-8192-max (get next cursor-hash-bytes) none)
              (err u100)))
            (wormhole-core-address (unwrap! 
              (principal-construct? 
                (get value cursor-version) 
                (get value cursor-hash-bytes)
                (unwrap! (from-consensus-buff? (string-ascii 40) (get value cursor-contract-name)) (err u100)))
              (err u100))))
        (ok wormhole-core-address))))

(define-private (parse-and-verify-pyth-oracle-contract (pyth-oracle-contract-bytes (buff 8192)))
  (let ((gi (try! (parse-and-verify-governance-instruction pyth-oracle-contract-bytes))))
      (asserts! (is-eq (get action gi) GOVERNANCE_UPGRADE_CONTRACT_PYTH_ORACLE) (err u1))
      ;; TODO: Check emitter-chain and emitter-address
      (let ((cursor-version (unwrap! (contract-call? .hk-cursor-v1 read-buff-1 (get next (get cursor gi))) 
              (err u100)))
            (cursor-hash-bytes (unwrap! (contract-call? .hk-cursor-v1 read-buff-20 (get next cursor-version)) 
              (err u100)))
            (cursor-contract-name (unwrap! (contract-call? .hk-cursor-v1 read-buff-8192-max (get next cursor-hash-bytes) none)
              (err u100)))
            (pyth-oracle-address (unwrap! 
              (principal-construct? 
                (get value cursor-version) 
                (get value cursor-hash-bytes)
                (unwrap! (from-consensus-buff? (string-ascii 40) (get value cursor-contract-name)) (err u100)))
              (err u100))))
        (ok pyth-oracle-address))))

(define-private (parse-and-verify-prices-data-sources (prices-data-sources-bytes (buff 8192)))
  (let ((gi (try! (parse-and-verify-governance-instruction prices-data-sources-bytes))))
      (asserts! (is-eq (get action gi) GOVERNANCE_SET_DATA_SOURCES) (err u1))
      ;; TODO: Check emitter-chain and emitter-address
      (let ((cursor-num-data-sources (try! (contract-call? .hk-cursor-v1 read-uint-8 { bytes: prices-data-sources-bytes, pos: u0 })))
            (cursor-data-sources-bytes (contract-call? .hk-cursor-v1 slice (get next cursor-num-data-sources) none))
            (data-sources (get result (fold parse-data-sources cursor-data-sources-bytes { 
              result: (list), 
              cursor: {
                index: u0,
                next-update-index: u0
              },
              bytes: cursor-data-sources-bytes,
              limit: (get value cursor-num-data-sources) 
            }))))
        (ok data-sources))))

(define-private (parse-data-sources
      (entry (buff 1)) 
      (acc { 
        cursor: { 
          index: uint,
          next-update-index: uint
        },
        bytes: (buff 8192),
        result: (list 255 { emitter-chain: uint, emitter-address: (buff 32) }), 
        limit: uint
      }))
  (if (is-eq (len (get result acc)) (get limit acc))
    acc
    (if (is-eq (get index (get cursor acc)) (get next-update-index (get cursor acc)))
      ;; Parse update
      (let ((buffer (contract-call? .hk-cursor-v1 new (get bytes acc) (some (get index (get cursor acc)))))
            (cursor-emitter-chain (unwrap-panic (contract-call? .hk-cursor-v1 read-uint-8 (get next buffer))))
            (cursor-emitter-address (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-32 (get next cursor-emitter-chain)))))
        ;; Perform assertions
        {
          cursor: { 
            index: (+ (get index (get cursor acc)) u1),
            next-update-index: (+ (get index (get cursor acc)) u33),
          },
          bytes: (get bytes acc),
          result: (unwrap-panic (as-max-len? (append (get result acc) { 
            emitter-chain: (get value cursor-emitter-chain), 
            emitter-address: (get value cursor-emitter-address) 
          }) u255)),
          limit: (get limit acc),
        })
      ;; Increment position
      {
          cursor: { 
            index: (+ (get index (get cursor acc)) u1),
            next-update-index: (get next-update-index (get cursor acc)),
          },
          bytes: (get bytes acc),
          result: (get result acc),
          limit: (get limit acc)
      })))

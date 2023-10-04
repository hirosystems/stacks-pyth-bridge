
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

(use-trait pyth-oracle-trait .pyth-oracle-trait.pyth-oracle-trait)
(use-trait wormhole-core-trait .wormhole-core-trait.wormhole-core-trait)

(define-data-var active-oracle-contract-address principal .pyth-oracle-v1)
(define-data-var active-wormhole-core-address principal .wormhole-core-dev-preview-1)
(define-data-var active-fee-recipient-address principal tx-sender)

(define-public (read-price-feed 
    (price-feed-id (buff 32)) 
    (pyth-oracle-address <pyth-oracle-trait>))
    (begin
        ;; Ensure that the active contract is being invoke
        (asserts! (is-eq (contract-of pyth-oracle-address) (var-get active-oracle-contract-address)) (err u0))
        ;; Perform contract-call
        (contract-call? pyth-oracle-address read-price-feed price-feed-id)))

(define-public (verify-and-update-price-feeds 
    (price-feed-bytes (buff 8192)) 
    (pyth-oracle-address <pyth-oracle-trait>)
    (wormhole-core-address <wormhole-core-trait>))
    (begin
        ;; Ensure that the active contract is being invoke
        (asserts! (is-eq (contract-of pyth-oracle-address) (var-get active-oracle-contract-address)) (err u0))
        ;; Ensure that the active contract is being invoke
        (asserts! (is-eq (contract-of wormhole-core-address) (var-get active-wormhole-core-address)) (err u1))
        ;; Perform contract-call
        (contract-call? pyth-oracle-address verify-and-update-price-feeds price-feed-bytes wormhole-core-address)))

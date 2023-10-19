;; Title: pyth-store
;; Version: v1
;; Check for latest version: https://github.com/hirosystems/stacks-pyth-bridge#latest-version
;; Report an issue: https://github.com/hirosystems/stacks-pyth-bridge/issues

(impl-trait .pyth-traits-v1.storage-trait)

(define-map prices (buff 32) {
  price: int,
  conf: uint,
  expo: int,
  ema-price: int,
  ema-conf: uint,
  publish-time: uint,
  prev-publish-time: uint,
})

(define-map timestamps (buff 32) uint)

(define-public (read (price-identifier (buff 32)))
  (let ((entry (unwrap! (map-get? prices price-identifier) (err u404))))
    (ok entry)))

(define-public (write (price-identifier (buff 32)) (data {
      price: int,
      conf: uint,
      expo: int,
      ema-price: int,
      ema-conf: uint,
      publish-time: uint,
      prev-publish-time: uint,
    }))
  (begin
    ;; Ensure that updates are always coming from the right contract
    (try! (contract-call? .pyth-governance-v1 check-execution-flow contract-caller none))
    ;; Update storage
    (ok (write-update price-identifier data))))

(define-public (write-batch (batch-updates (list 64 {
    price-identifier: (buff 32),
    price: int,
    conf: uint,
    expo: int,
    ema-price: int,
    ema-conf: uint,
    publish-time: uint,
    prev-publish-time: uint,
  })))
  (begin
    ;; Ensure that updates are always coming from the right contract
    (try! (contract-call? .pyth-governance-v1 check-execution-flow contract-caller none))
    ;; Update storage, count the number of updates
    (ok (fold + (map write-batch-entry batch-updates) u0))))

(define-private (write-batch-entry (entry {
      price-identifier: (buff 32),
      price: int,
      conf: uint,
      expo: int,
      ema-price: int,
      ema-conf: uint,
      publish-time: uint,
      prev-publish-time: uint,
    })) 
    (if (write-update (get price-identifier entry) {
          price: (get price entry),
          conf: (get conf entry),
          expo: (get expo entry),
          ema-price: (get ema-price entry),
          ema-conf: (get ema-conf entry),
          publish-time: (get publish-time entry),
          prev-publish-time: (get prev-publish-time entry)
        })
        u1
        u0))

(define-private (write-update (price-identifier (buff 32)) (data {
      price: int,
      conf: uint,
      expo: int,
      ema-price: int,
      ema-conf: uint,
      publish-time: uint,
      prev-publish-time: uint,
    }))
  (begin
    (if (not (is-price-update-outdated price-identifier (get publish-time data)))
      (map-set prices price-identifier data)
      false)))

(define-private (is-price-update-outdated (price-identifier (buff 32)) (publish-time uint))
  (< publish-time (default-to u0 (map-get? timestamps price-identifier))))

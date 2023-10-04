(use-trait wormhole-core-trait .wormhole-core-trait.wormhole-core-trait)

(define-trait pyth-oracle-trait
  (
    (read-price-feed ((buff 32)) (response {
      price: int,
      conf: uint,
      expo: int,
      ema-price: int,
      ema-conf: uint,
      publish-time: uint,
      prev-publish-time: uint,
    } uint))

    (verify-and-update-price-feeds ((buff 8192) <wormhole-core-trait>) (response (list 64 {
      price-identifier: (buff 32),
      price: int,
      conf: uint,
      expo: int,
      ema-price: int,
      ema-conf: uint,
      publish-time: uint,
      prev-publish-time: uint,
    }) uint))
  )
)

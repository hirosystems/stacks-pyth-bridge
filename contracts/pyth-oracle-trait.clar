(define-trait pyth-oracle-trait
  (
    (update-prices-feeds ((list 4 (buff 2048))) (response (list 4 {
      price-feed-id: (buff 32),
      price: (buff 8),
      conf: (buff 8),
      expo: (buff 4),
      ema-price: (buff 8),
      ema-conf: (buff 8),
      status: (buff 1),
      attestation-time: (buff 8),
      publish-time: (buff 8),
      prev-publish-time: (buff 8),
      prev-price: (buff 8),
      prev-conf: (buff 8),
    }) uint))
  )
)

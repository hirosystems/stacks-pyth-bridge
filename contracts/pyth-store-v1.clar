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

(define-data-var timestamps uint u0)

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
  (ok u1))

(define-public (write-batch (batch (list 64 {
    price-identifier: (buff 32),
    price: int,
    conf: uint,
    expo: int,
    ema-price: int,
    ema-conf: uint,
    publish-time: uint,
    prev-publish-time: uint,
  })))
  (ok u1))

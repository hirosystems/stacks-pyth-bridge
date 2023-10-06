(define-map liquidity-providers-balances principal { cbtc-balance: uint, stx-balance: uint })

;; To complete
(define-public (add-cbtc-liquidity (cbtc-sats-in uint))
  (let ((balance u0))
    (unwrap! (contract-call? .cbtc-token transfer cbtc-in tx-sender (as-contract tx-sender) none) (err u1))
    (ok cbtc-in)))

;; To complete
(define-public (remove-cbtc-liquidity (cbtc-sats-out uint))
  (let ((balance u0))
    (unwrap! (contract-call? .cbtc-token transfer cbtc-out (as-contract tx-sender) tx-sender none) (err u1))
    (ok cbtc-out)))

;; To complete
(define-public (withdraw-stx (stx-out uint))
  (ok u1))

(define-public (swap-stx (stx-in uint))
  (let ((stx-price (try! (read-stx-price-from-pyth)))
        (btc-price (try! (read-btc-price-from-pyth)))
        (sat-price (* u100000000 btc-price))
        (cbtc-sats-out (/ (* stx-in sat-price) stx-price)))
    (unwrap! (contract-call? .cbtc-token transfer cbtc-sats-out (as-contract tx-sender) tx-sender none) (err u1))
    (unwrap! (stx-transfer? stx-in tx-sender (as-contract tx-sender)) (err u1))
    (ok { stx-in: stx-in, cbtc-sats-out: cbtc-sats-out } )))

(define-public (swap-stx-trustless (stx-in uint) (stx-price-feed (buff 2048)) (btc-price-feed (buff 2048)))
  (let ((stx-price (try! (update-and-read-stx-price-from-pyth stx-price-feed)))
        (btc-price (try! (update-and-read-btc-price-from-pyth btc-price-feed)))
        (sat-price (* u100000000 btc-price))
        (cbtc-sats-out (/ (* stx-in sat-price) (* stx-price))))
    (unwrap! (contract-call? .cbtc-token transfer cbtc-sats-out (as-contract tx-sender) tx-sender none) (err u1))
    (unwrap! (stx-transfer? stx-in tx-sender (as-contract tx-sender)) (err u1))
    (ok { stx-in: stx-in, cbtc-sats-out: cbtc-sats-out } )))

(define-private (update-and-read-stx-price-from-pyth (stx-price-feed (buff 2048))) 
  (let ((updated-prices-ids (unwrap! (contract-call? 'SP2J933XB2CP2JQ1A4FGN8JA968BBG3NK3EKZ7Q9F.pyth-oracle-dev-preview-1 update-prices-feeds (list stx-price-feed)) (err u0)))
        (price-id (unwrap! (element-at? updated-prices-ids u0) (err u0))))
    (read-price-from-pyth price-id)))

(define-private (update-and-read-btc-price-from-pyth (btc-price-feed (buff 2048)))
  (let ((updated-prices-ids (unwrap! (contract-call? 'SP2J933XB2CP2JQ1A4FGN8JA968BBG3NK3EKZ7Q9F.pyth-oracle-dev-preview-1 update-prices-feeds (list btc-price-feed)) (err u0)))
        (price-id (unwrap! (element-at? updated-prices-ids u0) (err u0))))
    (read-price-from-pyth price-id)))

(define-private (read-stx-price-from-pyth) 
  (read-price-from-pyth 0xec7a775f46379b5e943c3526b1c8d54cd49749176b0b98e02dde68d1bd335c17))

(define-private (read-btc-price-from-pyth)
  (read-price-from-pyth 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43))

(define-private (read-price-from-pyth (price-id (buff 32)))
    (let ((feed (unwrap! (contract-call? 'SP2J933XB2CP2JQ1A4FGN8JA968BBG3NK3EKZ7Q9F.pyth-oracle-dev-preview-1 read-price-feed price-id) (err u0)))
          (price (get price feed)))
      (ok (to-uint price))))

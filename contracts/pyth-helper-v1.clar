

;; (define-public (verify-and-update-price-feeds 
;;     (price-feed-bytes (buff 8192)))
;;     (contract-call? .pyth-oracle-v1 verify-and-update-price-feeds 
;;         price-feed-bytes 
;;         {
;;             pyth-storage-contract: .pyth-store-v1,
;;             pyth-decoder-contract: .pyth-pnau-decoder-v1,
;;             wormhole-core-contract: .wormhole-core-v1
;;         }))

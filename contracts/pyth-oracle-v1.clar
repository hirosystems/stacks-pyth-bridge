;; Title: pyth-oracle
;; Version: v1
;; Check for latest version: https://github.com/hirosystems/stacks-pyth-bridge#latest-version
;; Report an issue: https://github.com/hirosystems/stacks-pyth-bridge/issues

;;;; Traits

;;;; Constants

;; Price Feeds Ids (https://pyth.network/developers/price-feed-ids#pyth-evm-mainnet)
(define-constant STX_USD 0xec7a775f46379b5e943c3526b1c8d54cd49749176b0b98e02dde68d1bd335c17)
(define-constant BTC_USD 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43)
(define-constant ETH_USD 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace)

(define-constant PNAU_MAGIC 0x504e4155) ;; 'PNAU': Pyth Network Accumulator Update
(define-constant AUWV_MAGIC 0x41555756) ;; 'AUWV': Accumulator Update Wormhole Verficiation
(define-constant PYTHNET_MAJOR_VERSION u0)
(define-constant PYTHNET_MINOR_VERSION u0)

;; Generic error
(define-constant ERR_PANIC (err u0))
;; Unable to price feed magic bytes
(define-constant ERR_PARSING_MAGIC_BYTES (err u2001))
;; Unable to parse major version
(define-constant ERR_PARSING_VERSION_MAJ (err u2002))
;; Unable to parse minor version
(define-constant ERR_PARSING_VERSION_MIN (err u2003))
;; Unable to parse trailing header size
(define-constant ERR_PARSING_HEADER_TRAILING_SIZE (err u2004))
;; Unable to parse update type
(define-constant ERR_PARSING_PROOF_TYPE (err u2005))
;; Price not found
(define-constant ERR_NOT_FOUND (err u0))

;;;; Data maps
;;
(define-map prices
  { price-feed-id: (buff 32) } 
  {
    price: int,
    conf: uint,
    expo: int,
    attestation-time: uint,
    ema-price: int,
    ema-conf: uint,
    status: uint,
    publish-time: uint,
    prev-publish-time: uint,
    prev-price: int,
    prev-conf: uint,
  })

(define-data-var watched-price-feeds 
  (list 1024 (buff 32)) 
  (list STX_USD BTC_USD ETH_USD))

;;;; Public functions
;;
(define-public (update-prices-feeds (pnau-bytes (buff 8192)))
  (let ((cursor-pnau-header (try! (parse-pnau-header pnau-bytes)))
        (cursor-pnau-vaa-size (try! (contract-call? .hk-cursor-v2 read-u16 (get next cursor-pnau-header))))
        (cursor-pnau-vaa (try! (contract-call? .hk-cursor-v2 read-buff-max-len-2048 (get next cursor-pnau-vaa-size) (get value cursor-pnau-vaa-size))))
        (vaa (try! (contract-call? .wormhole-core-dev-preview-1 parse-and-verify-vaa (get value cursor-pnau-vaa))))
        (cursor-merkle-root-data (try! (parse-merkle-root-data-from-vaa-payload (get payload vaa))))
        (decoded-prices-updates (parse-and-verify-prices-updates (get value cursor-pnau-vaa) (get merkle-root-hash (get value cursor-merkle-root-data)))))
        ;; (watched-prices-feeds (var-get watched-price-feeds))
        ;; (updated-prices-feeds (get updated-prices-feeds (fold process-prices-attestations-batch decoded-prices-attestations-batches { input: watched-prices-feeds, updated-prices-feeds: (list) }))))
    (ok decoded-prices-updates)))

;;;; Read only functions
;;

(define-read-only (read-price-feed (price-feed-id (buff 32)))
  (let ((price-feed-entry (unwrap! (map-get? prices { price-feed-id: price-feed-id }) ERR_NOT_FOUND)))
    (ok price-feed-entry)))

;;;; Private functions
;;
(define-private (parse-merkle-root-data-from-vaa-payload (payload-vaa-bytes (buff 2048)))
  (let ((cursor-payload-type (unwrap! (contract-call? .hk-cursor-v2 read-u32 { bytes: payload-vaa-bytes, pos: u0 }) 
          (err u0)))
        (cursor-wh-update-type (unwrap! (contract-call? .hk-cursor-v2 read-u8 (get next cursor-payload-type)) 
          (err u0)))
        (cursor-merkle-root-slot (unwrap! (contract-call? .hk-cursor-v2 read-u64 (get next cursor-wh-update-type)) 
          (err u0)))
        (cursor-merkle-root-ring-size (unwrap! (contract-call? .hk-cursor-v2 read-u32 (get next cursor-merkle-root-slot)) 
          (err u0)))
        (cursor-merkle-root-hash (unwrap! (contract-call? .hk-cursor-v2 read-buff-20 (get next cursor-merkle-root-ring-size)) 
          (err u0))))
    (ok {
      value: {
        merkle-root-slot: (get value cursor-merkle-root-slot),
        merkle-root-ring-size: (get value cursor-merkle-root-ring-size),
        merkle-root-hash: (get value cursor-merkle-root-hash),
        payload-type: (get value cursor-payload-type)
      },
      next: (get next cursor-merkle-root-hash)
    })))

(define-read-only (parse-pnau-header (pf-bytes (buff 8192)))
  (let ((cursor-magic (unwrap! (contract-call? .hk-cursor-v2 read-buff-4 { bytes: pf-bytes, pos: u0 }) 
          ERR_PARSING_MAGIC_BYTES))
        ;; Todo: check magic bytes
        (cursor-version-maj (unwrap! (contract-call? .hk-cursor-v2 read-u8 (get next cursor-magic)) 
          ERR_PARSING_VERSION_MAJ))
        ;; Todo: check major version
        (cursor-version-min (unwrap! (contract-call? .hk-cursor-v2 read-u8 (get next cursor-version-maj)) 
          ERR_PARSING_VERSION_MIN))
        ;; Todo: check minor version
        (cursor-header-trailing-size (unwrap! (contract-call? .hk-cursor-v2 read-u8 (get next cursor-version-min)) 
          ERR_PARSING_HEADER_TRAILING_SIZE))
        ;; Question: proof_type (move) vs updateType (solidity)
        (cursor-proof-type (unwrap! (contract-call? .hk-cursor-v2 read-u8 {
            bytes: pf-bytes,
            pos: (+ (get pos (get next cursor-header-trailing-size)) (get value cursor-header-trailing-size))})
          ERR_PARSING_PROOF_TYPE)))
    (ok {
      value: {
        magic: (get value cursor-magic),
        version-maj: (get value cursor-version-maj),
        version-min: (get value cursor-version-min),
        header-trailing-size: (get value cursor-header-trailing-size),
        proof-type: (get value cursor-proof-type)
      },
      next: (get next cursor-proof-type)
    })))

(define-read-only (parse-and-verify-prices-updates (bytes (buff 8192)) (merkle-root-hash (buff 32)))
  (let ((cursor-num-updates (try! (contract-call? .hk-cursor-v2 read-u8 { bytes: bytes, pos: u0 })))
        (cursor-updates-bytes (contract-call? .hk-cursor-v2 slice (get next cursor-num-updates)))
        (updates (get result (fold parse-price-info-and-proof cursor-updates-bytes { 
          result: (list), 
          cursor: {
            index: u0,
            next-update-index: u0
          },
          bytes: cursor-updates-bytes,
          limit: (get value cursor-num-updates) 
        }))))
    (ok updates)))

(define-private (parse-price-info-and-proof
      (entry (buff 1))
      (acc { 
        cursor: { 
          index: uint,
          next-update-index: uint
        },
        bytes: (buff 8192),
        result: (list 160 {
          price-identifier: (buff 32),
          price: int,
          conf: uint,
          expo: int,
          publish-time: uint,
          prev-publish-time: uint,
          ema-price: int,
          ema-conf: uint,
          proof: (list 255 (buff 20)),
        }), 
        limit: uint
      }))
  (if (is-eq (len (get result acc)) (get limit acc))
    acc
    (if (is-eq (get index (get cursor acc)) (get next-update-index (get cursor acc)))
      ;; Parse update
      (let ((cursor-update (contract-call? .hk-cursor-v2 new (get bytes acc) (some (get index (get cursor acc)))))
            (cursor-message-size (unwrap-panic (contract-call? .hk-cursor-v2 read-u16 (get next cursor-update)))) ;; Question: not used?
            (cursor-message-type (unwrap-panic (contract-call? .hk-cursor-v2 read-u8 (get next cursor-message-size))))
            (cursor-price-identifier (unwrap-panic (contract-call? .hk-cursor-v2 read-buff-32 (get next cursor-message-type))))
            (cursor-price (unwrap-panic (contract-call? .hk-cursor-v2 read-buff-8 (get next cursor-price-identifier))))
            (cursor-conf (unwrap-panic (contract-call? .hk-cursor-v2 read-buff-8 (get next cursor-price))))
            (cursor-expo (unwrap-panic (contract-call? .hk-cursor-v2 read-buff-4 (get next cursor-conf))))
            (cursor-publish-time (unwrap-panic (contract-call? .hk-cursor-v2 read-buff-8 (get next cursor-expo))))
            (cursor-prev-publish-time (unwrap-panic (contract-call? .hk-cursor-v2 read-buff-8 (get next cursor-publish-time))))
            (cursor-ema-price (unwrap-panic (contract-call? .hk-cursor-v2 read-buff-8 (get next cursor-prev-publish-time))))
            (cursor-ema-conf (unwrap-panic (contract-call? .hk-cursor-v2 read-buff-8 (get next cursor-ema-price))))
            (cursor-proof (contract-call? .hk-cursor-v2 advance (get next cursor-message-size) (get value cursor-message-size)))
            (cursor-proof-size (unwrap-panic (contract-call? .hk-cursor-v2 read-buff-8 cursor-proof)))
            (proof-bytes (contract-call? .hk-cursor-v2 slice (get next cursor-proof-size)))
            (proof (get result (fold parse-proof proof-bytes { 
              result: (list),
              cursor: {
                index: u0,
                next-update-index: u0
              },
              bytes: proof-bytes,
              limit: (buff-to-uint-be (get value cursor-proof-size)) 
            }))))
        ;; Perform assertions
        ;; TODO
        ;; (tuple (bytes (buff 8192)) (cursor (tuple (index uint) (next-update-index uint))) (limit uint) (result (list 255 (buff 20))))
        ;; (tuple (bytes (buff 8192)) (cursor (tuple (index uint) (next-update-index uint))) (limit (buff 8)) (result (list 0 UnknownType)))
        ;; Increment position, next update index and augment result
        {
          cursor: { 
            index: (+ (get index (get cursor acc)) u1),
            next-update-index: (+ (get index (get cursor acc)) (+ (get pos (get next cursor-proof-size)) (buff-to-uint-be (get value cursor-proof-size)))),
          },
          bytes: (get bytes acc),
          result: (unwrap-panic (as-max-len? (append (get result acc) {
            price-identifier: (get value cursor-price-identifier),
            price: (buff-to-int-be (get value cursor-price)),
            conf: (buff-to-uint-be (get value cursor-conf)),
            expo: (buff-to-int-be (get value cursor-expo)),
            publish-time: (buff-to-uint-be (get value cursor-publish-time)),
            prev-publish-time: (buff-to-uint-be (get value cursor-prev-publish-time)),
            ema-price: (buff-to-int-be (get value cursor-ema-price)),
            ema-conf: (buff-to-uint-be (get value cursor-ema-conf)),
            proof: proof
          }) u160)),
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
          limit: (get limit acc),
      })))

(define-private (parse-proof
      (entry (buff 1)) 
      (acc { 
        cursor: { 
          index: uint,
          next-update-index: uint
        },
        bytes: (buff 8192),
        result: (list 255 (buff 20)), 
        limit: uint
      }))
  (if (is-eq (len (get result acc)) (get limit acc))
    acc
    (if (is-eq (get index (get cursor acc)) (get next-update-index (get cursor acc)))
      ;; Parse update
      (let ((cursor-hash (contract-call? .hk-cursor-v2 new (get bytes acc) (some (get index (get cursor acc)))))
            (hash (get value (unwrap-panic (contract-call? .hk-cursor-v2 read-buff-20 (get next cursor-hash))))))
          ;; Perform assertions
        {
          cursor: { 
            index: (+ (get index (get cursor acc)) u1),
            next-update-index: (+ (get index (get cursor acc)) (+ (get pos (get next cursor-hash)) u20)),
          },
          bytes: (get bytes acc),
          result: (unwrap-panic (as-max-len? (append (get result acc) hash) u255)),
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

(define-private (process-prices-attestations-batch 
      (entry (response 
        { 
          attestation-size: uint, 
          attestations-count: uint, 
          price-attestations: (list 254 {
            price-feed-id: (buff 32),
            price: int,
            conf: uint,
            expo: int,
            ema-price: int,
            ema-conf: uint,
            status: uint,
            attestation-time: uint,
            publish-time: uint,
            prev-publish-time: uint,
            prev-price: int,
            prev-conf: uint,
          })
        } 
        uint)) 
      (acc { 
        input: (list 2048 (buff 32)), 
        updated-prices-feeds: (list 2048 (buff 32)) 
      }))
  (let ((batch (unwrap-panic entry))
        (updated-prices-feeds (get updated-prices-feeds (fold process-price-attestation (get price-attestations batch) acc))))
    {
      input: (get input acc),
      updated-prices-feeds: updated-prices-feeds
    }))

(define-private (process-price-attestation 
      (entry {
        price-feed-id: (buff 32),
        price: int,
        conf: uint,
        expo: int,
        ema-price: int,
        ema-conf: uint,
        status: uint,
        attestation-time: uint,
        publish-time: uint,
        prev-publish-time: uint,
        prev-price: int,
        prev-conf: uint,
        }) 
      (acc { input: (list 2048 (buff 32)), updated-prices-feeds: (list 2048 (buff 32)) }))
  (match (index-of? (get input acc) (get price-feed-id entry)) 
    index (begin 
      ;; Update Price Feed
      (map-set prices 
        { 
          price-feed-id: (get price-feed-id entry), 
        }
        {
          price: (get price entry), 
          conf: (get conf entry), 
          expo: (get expo entry), 
          ema-price: (get ema-price entry), 
          ema-conf: (get ema-conf entry), 
          status: (get status entry), 
          attestation-time: (get attestation-time entry), 
          publish-time: (get publish-time entry), 
          prev-publish-time: (get prev-publish-time entry), 
          prev-price: (get prev-price entry), 
          prev-conf: (get prev-conf entry), 
        })
      ;; TODO: check timestamps
      ;; Emit event
      (print { type: "price-feed", action: "updated", data: entry })
      {
        input: (get input acc),
        updated-prices-feeds: (unwrap-panic (as-max-len? (append (get updated-prices-feeds acc) (get price-feed-id entry)) u2048))
      })
    acc))

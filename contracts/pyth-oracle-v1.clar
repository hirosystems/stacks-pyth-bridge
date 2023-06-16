
;; title: pyth-oracle-v1
;; version:
;; summary:
;; description:

;; traits
;;

;; token definitions
;; 

;; constants
;;
;; Generic error
(define-constant ERR_PANIC (err u0))
;; Unable to <>
(define-constant ERR_PARSING_PF_MAGIC_BYTES (err u2001))
;; Unable to <>
(define-constant ERR_PARSING_PF_VERSION_MAJ (err u2002))
;; Unable to <>
(define-constant ERR_PARSING_PF_VERSION_MIN (err u2003))
;; Unable to <>
(define-constant ERR_PARSING_PF_TRAILING_HEADER_SIZE (err u2004))
;; Unable to <>
(define-constant ERR_PARSING_PF_UPDATE_TYPE (err u2005))

(define-constant ERR_PARSING_PF_PAYLOAD_ID (err u2006))

(define-constant ERR_PARSING_PF_ATTESTATION_COUNT (err u2007))

(define-constant ERR_PARSING_PF_ATTESTATION_SIZE (err u2008))

(define-constant ERR_SLICING_PF_ATTESTATION_BYTES (err u2009))

(define-constant ERR_PARSING_PRICE_ATTESTATION (err u2010))


;; data vars
;;
(define-public (update-price-feeds (vaas (list 20 (buff 2048))))
    (let ((decoded-vaas (map parse-and-verify-vaa vaas))
        (price-feeds (map parse-and-verify-price-attestations decoded-vaas))
        ;; (updated-price-feeds (map update-price-feed price-feeds))
        )
        (ok price-feeds)))

;; data maps
;;

;; public functions
;;

;; read only functions
;;

;; private functions
;;
(define-private (parse-and-verify-vaa (vaa-bytes (buff 2048)))
    (let ((vaa (unwrap-panic (contract-call? .wormhole-core-v1 parse-and-verify-vaa vaa-bytes))))
        (get payload vaa)))

(define-private (parse-price-feed-header (pf-bytes (buff 2048)))
        (let 
            ((cursor-magic (unwrap! (contract-call? .hk-cursor-v1 read-buff-4 { bytes: pf-bytes, pos: u0 }) 
                ERR_PARSING_PF_MAGIC_BYTES))
             ;; Todo: check magic bytes
            (cursor-version-maj (unwrap! (contract-call? .hk-cursor-v1 read-u16 (get next cursor-magic)) 
                ERR_PARSING_PF_VERSION_MAJ))
            ;; Todo: check major version
            (cursor-version-min (unwrap! (contract-call? .hk-cursor-v1 read-u16 (get next cursor-version-maj)) 
                ERR_PARSING_PF_VERSION_MIN))
            ;; Todo: check minor version
            (cursor-trailing-header-size (unwrap! (contract-call? .hk-cursor-v1 read-u16 (get next cursor-version-min)) 
                ERR_PARSING_PF_TRAILING_HEADER_SIZE))
            ;; We use another offset for the trailing header and in the end add the
            ;; offset by trailingHeaderSize to skip the future headers.
            (cursor-udpate-type (unwrap! (contract-call? .hk-cursor-v1 read-u16 { bytes: pf-bytes, pos: (+ (get pos (get next cursor-trailing-header-size)) 
                                                                                                           (get value cursor-trailing-header-size)) })
                ERR_PARSING_PF_UPDATE_TYPE)))
            (ok {
                value: {
                    magic: (get value cursor-magic),
                    version-maj: (get value cursor-version-maj),
                    version-min: (get value cursor-version-min),
                    trailing-header-size: (get value cursor-trailing-header-size),
                },
                next: (get next cursor-udpate-type)
            })))

(define-private (parse-price-attestations-header (pf-bytes (buff 2048)))
        (let 
            ((cursor-magic (unwrap! (contract-call? .hk-cursor-v1 read-buff-4 { bytes: pf-bytes, pos: u0 }) 
                ERR_PARSING_PF_MAGIC_BYTES))
             ;; Todo: check magic bytes
            (cursor-version-maj (unwrap! (contract-call? .hk-cursor-v1 read-u16 (get next cursor-magic)) 
                ERR_PARSING_PF_VERSION_MAJ))
            ;; Todo: check major version
            (cursor-version-min (unwrap! (contract-call? .hk-cursor-v1 read-u16 (get next cursor-version-maj)) 
                ERR_PARSING_PF_VERSION_MIN))
            ;; Todo: check minor version
            (cursor-header-size (unwrap! (contract-call? .hk-cursor-v1 read-u16 (get next cursor-version-min)) 
                ERR_PARSING_PF_TRAILING_HEADER_SIZE))
            ;; Todo: check minor version
            (cursor-payload-id (unwrap! (contract-call? .hk-cursor-v1 read-u8 (get next cursor-header-size)) 
                ERR_PARSING_PF_PAYLOAD_ID)))
            (ok {
                value: {
                    magic: (get value cursor-magic),
                    version-maj: (get value cursor-version-maj),
                    version-min: (get value cursor-version-min),
                    header-size: (get value cursor-header-size),
                    payload-id: (get value cursor-payload-id)
                },
                next: { 
                    bytes: pf-bytes, 
                    pos: (+ (get pos (get next cursor-payload-id)) 
                            (- (get value cursor-header-size) u1)) 
                }
            })))

(define-private (is-price-attestation-cue (byte (buff 1)) (acc { cursor: uint, result: (list 64 uint), size: uint }))
    (if (and (is-eq u0 (mod (get cursor acc) (get size acc))) (> (get cursor acc) u0) )
        { 
            cursor: (+ u1 (get cursor acc)), 
            result: (unwrap-panic (as-max-len? (append (get result acc) (get cursor acc)) u64)),
            size: (get size acc) 
        }
        {
            cursor: (+ u1 (get cursor acc)), 
            result: (get result acc),
            size: (get size acc) 
        }))

(define-private (parse-price-attestation (cue-position uint) (acc { attestations-bytes: (buff 2048), result: (list 64 {
            price-identifier: (buff 32),
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
        })}))
    (let (
        
        (cursor-obsolete-1 (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-32 { bytes: (get attestations-bytes acc), pos: cue-position })))
        (cursor-price-identifier (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-32 (get next cursor-obsolete-1))))
        (cursor-price (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-8 (get next cursor-price-identifier))))
        (cursor-conf (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-8 (get next cursor-price))))
        (cursor-expo (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-4 (get next cursor-conf))))
        (cursor-ema-price (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-8 (get next cursor-expo))))
        (cursor-ema-conf (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-8 (get next cursor-ema-price))))
        (cursor-status (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-1 (get next cursor-ema-conf))))
        (cursor-obsolete-2 (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-4 (get next cursor-status))))
        (cursor-obsolete-3 (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-4 (get next cursor-obsolete-2))))
        (cursor-attestation-time (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-8 (get next cursor-obsolete-3))))
        (cursor-publish-time (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-8 (get next cursor-attestation-time))))
        (cursor-prev-publish-time (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-8 (get next cursor-publish-time))))
        (cursor-prev-price (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-8 (get next cursor-prev-publish-time))))
        (cursor-prev-conf (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-8 (get next cursor-prev-price))))
    )
    {
        attestations-bytes: (get attestations-bytes acc),
        result: (unwrap-panic (as-max-len? (append (get result acc) {
            price-identifier: (get value cursor-price-identifier),
            price: (get value cursor-price),
            conf: (get value cursor-conf),
            expo: (get value cursor-expo),
            ema-price: (get value cursor-ema-price),
            ema-conf: (get value cursor-ema-conf),
            status: (get value cursor-status),
            attestation-time: (get value cursor-attestation-time),
            publish-time: (get value cursor-publish-time),
            prev-publish-time: (get value cursor-prev-publish-time),
            prev-price: (get value cursor-prev-price),
            prev-conf: (get value cursor-prev-conf),
        }) u64))
    }))

(define-private (decode-price-attestation (element {
            price-identifier: (buff 32),
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
        }))
    {
        price-identifier: (get price-identifier element),
        price: (buff-to-int-be (get price element)),
        conf: (buff-to-uint-be (get conf element)),
        expo: (buff-to-int-be (get expo element)),
        ema-price: (buff-to-int-be (get ema-price element)),
        ema-conf: (buff-to-uint-be (get ema-conf element)),
        status: (buff-to-uint-be (get status element)),
        attestation-time: (buff-to-uint-be (get attestation-time element)),
        publish-time: (buff-to-uint-be (get publish-time element)),
        prev-publish-time: (buff-to-uint-be (get prev-publish-time element)),
        prev-price: (buff-to-int-be (get prev-price element)),
        prev-conf: (buff-to-uint-be (get prev-conf element)),
    })

(define-public (parse-and-verify-price-attestations (pf-bytes (buff 2048)))
    (let ((cursor-price-attestations-header (try! (parse-price-attestations-header pf-bytes)))
        (cursor-attestations-count (unwrap! (contract-call? .hk-cursor-v1 read-u16 (get next cursor-price-attestations-header)) 
            ERR_PARSING_PF_ATTESTATION_COUNT))
        (cursor-attestation-size (unwrap! (contract-call? .hk-cursor-v1 read-u16 (get next cursor-attestations-count)) 
            ERR_PARSING_PF_ATTESTATION_SIZE))
        (attestations-bytes (print (unwrap! (slice? pf-bytes (get pos (get next cursor-attestation-size)) (+ (get pos (get next cursor-attestation-size)) (* (get value cursor-attestations-count) (get value cursor-attestation-size))))
            ERR_SLICING_PF_ATTESTATION_BYTES)))
        (attestations-cues (get result (fold is-price-attestation-cue attestations-bytes { size: (get value cursor-attestation-size), cursor: u0, result: (unwrap-panic (as-max-len? (list u0) u64)) })))
        (encoded-price-attestations (get result (fold parse-price-attestation attestations-cues { attestations-bytes: attestations-bytes, result: (unwrap-panic (as-max-len? (list {
            price-identifier: (unwrap-panic (as-max-len? 0x u32)),
            price: (unwrap-panic (as-max-len? 0x u8)),
            conf: (unwrap-panic (as-max-len? 0x u8)),
            expo: (unwrap-panic (as-max-len? 0x u4)),
            ema-price: (unwrap-panic (as-max-len? 0x u8)),
            ema-conf: (unwrap-panic (as-max-len? 0x u8)),
            status: (unwrap-panic (as-max-len? 0x u1)),
            attestation-time: (unwrap-panic (as-max-len? 0x u8)),
            publish-time: (unwrap-panic (as-max-len? 0x u8)),
            prev-publish-time: (unwrap-panic (as-max-len? 0x u8)),
            prev-price: (unwrap-panic (as-max-len? 0x u8)),
            prev-conf: (unwrap-panic (as-max-len? 0x u8)),
        }) u64)) })))
        (price-attestations (map decode-price-attestation (unwrap-panic (slice? encoded-price-attestations u1 (+ u1 (get value cursor-attestations-count))))))
    ;; Todo: check minor version
    ;;   (cursor-trailing-header-size (unwrap! (contract-call? .hk-cursor-v1 read-u8 (get next cursor-price-feed-header)) 
    ;;     ERR_PARSING_PF_TRAILING_HEADER_SIZE))
    ;;   (cursor-udpate-type (unwrap! (contract-call? .hk-cursor-v1 read-u8 (get next cursor-trailing-header-size)) 
    ;;     ERR_PARSING_PF_VERSION_MIN))
        
    ;;   (cursor-guardian-set (unwrap! (contract-call? .hk-cursor-v1 read-u32 (get next cursor-version)) 
    ;;     ERR_PARSING_VAA_GUARDIAN_SET))
    ;;   (cursor-signatures (fold 
    ;;     batch-read-signatures
    ;;     (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0)
    ;;     { 
    ;;         next: (get next cursor-signatures-len), 
    ;;         value: (list),
    ;;         iter: (get value cursor-signatures-len)
    ;;     }))
    )
        (ok {
            price-attestations-header: (get value cursor-price-attestations-header),
            attestations-count: (get value cursor-attestations-count),
            attestation-size: (get value cursor-attestation-size),
            ;; encoded-price-attestations: encoded-price-attestations,
            attestations-cues: attestations-cues,
            price-attestations: price-attestations
        })))

(define-private (parse-and-verify-price-feed (pf-bytes (buff 2048)))
        (let ((cursor-price-feed-header (try! (parse-price-feed-header pf-bytes)))
        ;; Todo: check minor version
          (cursor-trailing-header-size (unwrap! (contract-call? .hk-cursor-v1 read-u8 (get next cursor-price-feed-header)) 
            ERR_PARSING_PF_TRAILING_HEADER_SIZE))
          (cursor-udpate-type (unwrap! (contract-call? .hk-cursor-v1 read-u8 (get next cursor-trailing-header-size)) 
            ERR_PARSING_PF_VERSION_MIN))
        ;;   (cursor-guardian-set (unwrap! (contract-call? .hk-cursor-v1 read-u32 (get next cursor-version)) 
        ;;     ERR_PARSING_VAA_GUARDIAN_SET))
        ;;   (cursor-signatures (fold 
        ;;     batch-read-signatures
        ;;     (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0)
        ;;     { 
        ;;         next: (get next cursor-signatures-len), 
        ;;         value: (list),
        ;;         iter: (get value cursor-signatures-len)
        ;;     }))
        )
            (ok {
                price-feed-header: (get value cursor-price-feed-header),
                udpate-type: (get value cursor-udpate-type),
            })))

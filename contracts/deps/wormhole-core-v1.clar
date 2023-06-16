
;; Title: wormhole-core
;; Version: 1
;; Summary:
;; Description:

;;;; Traits

;; (define-trait message-publisher 
;;   ((publish-message (uint (buff 2048) uint) (response u1 u1))))

;;;; Constants

;; Initial set of guardians, used for initializing the contract
(define-constant GENESIS_GUARDIANS (list 
  0x02aee4b340973ab59eb244059031c85d1ecfbd58e2ab9922c6f8864a6d1a1ae3be 
  0x026a5f670606f793696111c4591dd0f12748344c784a1870c111935707a0b07452 
  0x02c0eb187e0d33072dd2979acefa10ca7c7fe3a5664d3b22b87447d1e9c400bb73 
  0x026664ae7a8a17d2a043777bd2db84436a0e6b17207f10ff8a647b66378063482c 
  0x02e8f4586c53cf0332f44a1dbbfa058561ae92daf755ed15e997ea15deb5f7afab 
  0x02bdcdcdac8f91c94f976ab020c72b0bf2042014a64da97f78478dbd6871189d66 
  0x025b0582caa9e5d3452aa62010aa44a052e2a111d81dfdf96d976f3daed924f480 
  0x0356bebfb91d9781594e42b28c8cf678582c07d72e6603c2c7fd9825d0f4a10715 
  0x0235e3f690e6c8938f43f24c52bfb46a6bd362e9e1ecfb8d3e8b95448680bd949c 
  0x03cf39f23b041ad6d314970124ebb841fbd2309d40e036d5234d0dc4ada3c846c0 
  0x02439123068274c1962a80e5688dd5d751c8170cb0e326edc5734032fd0b81b0ea 
  0x02f2ab45f5ca96118c9d12a2afabdaeea876706779412e1dec40585b42ac9dbd79 
  0x02f8f59376ab1c99446d158f7c8a909292119cc12859e2e865c02547f37b8d14d3
))
;; Generic error
(define-constant ERR_PANIC (err u0))
;; VAA version not supported
(define-constant ERR_PARSING_VAA_VERSION (err u1001))
;; Unable to extract the guardian set-id from the VAA
(define-constant ERR_PARSING_VAA_GUARDIAN_SET (err u1002))
;; Unable to extract the number of signatures from the VAA
(define-constant ERR_PARSING_VAA_SIGNATURES_LEN (err u1003))
;; Unable to extract the signatures from the VAA
(define-constant ERR_PARSING_VAA_SIGNATURES (err u1004))
;; Unable to extract the timestamp from the VAA
(define-constant ERR_PARSING_VAA_TIMESTAMP (err u1005))
;; Unable to extract the nonce from the VAA
(define-constant ERR_PARSING_VAA_NONCE (err u1006))
;; Unable to extract the emitter chain from the VAA
(define-constant ERR_PARSING_VAA_EMITTER_CHAIN (err u1007))
;; Unable to extract the emitter address from the VAA
(define-constant ERR_PARSING_VAA_EMITTER_ADDRESS (err u1008))
;; Unable to extract the sequence from the VAA
(define-constant ERR_PARSING_VAA_SEQUENCE (err u1009))
;; Unable to extract the consistency level from the VAA
(define-constant ERR_PARSING_VAA_CONSISTENCY_LEVEL (err u1010))
;; Unable to extract the payload from the VAA
(define-constant ERR_PARSING_VAA_PAYLOAD (err u1011))
;; Unable to extract the hash the payload from the VAA
(define-constant ERR_HASHING_VAA_BODY (err u1012))
;; Number of valid signatures insufficient (min: 13/19)
(define-constant ERR_THRESHOLD_SIGNATURE (err u1013))
;; Multiple signatures were issued by the same guardian
(define-constant ERR_REDUNDANT_SIGNATURE (err u1014))
;; Guardian set specified is expired
(define-constant ERR_GUARDIAN_SET_EXPIRED (err u1015))
;; Guardian signature not comprised in guardian set specified
(define-constant ERR_GUARDIAN_SET_CONSISTENCY (err u1016))

;;;; Data vars

(define-data-var current-guardian-set-id uint u0)

;;;; Data maps

;; Mapping guardian id [0, 19) -> { public-key, set-id }
(define-map active-guardians uint { public-key: (buff 66), set-id: uint })
;; Mapping guardian set id -> { expiration-time } + other future properties
(define-map guardian-set uint { expiration-time: uint })

;;;; Constructors
(begin
  (fold add-guardian-to-guardian-set GENESIS_GUARDIANS { id: u0, set-id: u0 }))

;;;; Public functions

;; @desc Update the active set of guardians 
;; @param expiration-time:
;; @param guardians:
(define-public (update-guardian-set (expiration-time uint) (guardians (list 19 { id: uint, public-key: (buff 66) })))
  (let ((set-id (var-get current-guardian-set-id))
        (new-set-id (+ set-id u1))) 
      ;; TODO: check authorization
      ;; Update set
      (fold add-guardian-to-guardian-set GENESIS_GUARDIANS { id: u0, set-id: new-set-id })
      ;; Update set-id
      (var-set current-guardian-set-id new-set-id)
      (ok { set-id: new-set-id, guardians: guardians })))

;; @desc Parse a Verified Action Approval (VAA)
;; 
;; VAA Header
;; byte        version             (VAA Version)
;; u32         guardian_set_index  (Indicates which guardian set is signing)
;; u8          len_signatures      (Number of signatures stored)
;; [][66]byte  signatures          (Collection of ecdsa signatures)
;;
;; VAA Body
;; u32         timestamp           (Timestamp of the block where the source transaction occurred)
;; u32         nonce               (A grouping number)
;; u16         emitter_chain       (Wormhole ChainId of emitter contract)
;; [32]byte    emitter_address     (Emitter contract address, in Wormhole format)
;; u64         sequence            (Strictly increasing sequence, tied to emitter address & chain)
;; u8          consistency_level   (What finality level was reached before emitting this message)
;; []byte      payload             (VAA message content)
;;
;; @param vaa-bytes: 
(define-read-only (parse-vaa (vaa-bytes (buff 2048)))
    (let ((cursor-version (unwrap! (contract-call? .hk-cursor-v1 read-u8 { bytes: vaa-bytes, pos: u0 }) 
            ERR_PARSING_VAA_VERSION))
          (cursor-guardian-set (unwrap! (contract-call? .hk-cursor-v1 read-u32 (get next cursor-version)) 
            ERR_PARSING_VAA_GUARDIAN_SET))
          (cursor-signatures-len (unwrap! (contract-call? .hk-cursor-v1 read-u8 (get next cursor-guardian-set)) 
            ERR_PARSING_VAA_SIGNATURES_LEN))
          (cursor-signatures (fold 
            batch-read-signatures
            (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0)
            { 
                next: (get next cursor-signatures-len), 
                value: (list),
                iter: (get value cursor-signatures-len)
            }))
          (vaa-body-hash (keccak256 (get value (unwrap! (contract-call? .hk-cursor-v1 read-remaining-bytes-max-2048 (get next cursor-signatures))
            ERR_HASHING_VAA_BODY))))
          (cursor-timestamp (unwrap! (contract-call? .hk-cursor-v1 read-u32 (get next cursor-signatures)) 
            ERR_PARSING_VAA_TIMESTAMP))
          (cursor-nonce (unwrap! (contract-call? .hk-cursor-v1 read-u32 (get next cursor-timestamp)) 
            ERR_PARSING_VAA_NONCE))
          (cursor-emitter-chain (unwrap! (contract-call? .hk-cursor-v1 read-u16 (get next cursor-nonce)) 
            ERR_PARSING_VAA_EMITTER_CHAIN))
          (cursor-emitter-address (unwrap! (contract-call? .hk-cursor-v1 read-buff-32 (get next cursor-emitter-chain)) 
            ERR_PARSING_VAA_EMITTER_ADDRESS))
          (cursor-sequence (unwrap! (contract-call? .hk-cursor-v1 read-u64 (get next cursor-emitter-address)) 
            ERR_PARSING_VAA_SEQUENCE))
          (cursor-consistency-level (unwrap! (contract-call? .hk-cursor-v1 read-u8 (get next cursor-sequence)) 
            ERR_PARSING_VAA_CONSISTENCY_LEVEL))
          (cursor-payload (unwrap! (contract-call? .hk-cursor-v1 read-remaining-bytes-max-2048 (get next cursor-consistency-level))
            ERR_PARSING_VAA_PAYLOAD))
          (public-keys-results (fold
            batch-recover-public-keys
            (get value cursor-signatures)
            {
                message-hash: vaa-body-hash,
                value: (list)
            }))
          (signatures-from-active-guardians (fold
            batch-check-active-public-keys
            (get value public-keys-results)
            {
                value: (list)
            }))
        )
        (ok { 
            version: (get value cursor-version), 
            guardian-set: (get value cursor-guardian-set),
            signatures-len: (get value cursor-signatures-len),
            signatures: (get value cursor-signatures),
            timestamp: (get value cursor-timestamp),
            nonce: (get value cursor-nonce),
            emitter-chain: (get value cursor-emitter-chain),
            sequence: (get value cursor-sequence),
            consistency-level: (get value cursor-consistency-level),
            payload: (get value cursor-payload),
            guardians-public-keys: (get value public-keys-results),
            signatures-from-active-guardians: (get value signatures-from-active-guardians),
            vaa-body-hash: vaa-body-hash
        })))

;; @desc Parse and check the validity of a Verified Action Approval (VAA)
;; @param vaa-bytes: 
(define-read-only (parse-and-verify-vaa (vaa-bytes (buff 2048)))
    (let ((vaa (try! (parse-vaa vaa-bytes)))) 
        ;; Ensure that version is supported (v1)
        (asserts! (is-eq (get version vaa) u1) (err u99))
        ;; TODO: Ensure that the count of valid signatures is >= 13
        ;; (asserts! (> (len (get value signatures-from-active-guardians)) u13) ERR_SIGNATURE_THRESHOLD)
        ;; TODO: Ensure that each guardian in signatures-from-active-guardians is unique
        ;; ERR_REDUNDANT_SIGNATURE
        ;; TODO: Ensure that the guardian set is not expired
        ;; ERR_GUARDIAN_SET_EXPIRED
        ;; TODO: Ensure that the number of signatures is legit
        ;; ERR_THRESHOLD_SIGNATURE
        ;; Good to go!
        (ok vaa)))

;; @desc Parse and check the validity of a Verified Action Approval (VAA)
;; @param nonce: number assigned to each message, providing a mechanism by which to group messages together within a Batch VAA.
;; @param consistency-level: level of finality the guardians will reach before signing the message. Consistency should be considered an enum, not an integer.
;; @param payload-bytes: raw bytes to emit. It is up to the emitting contract to properly define this arbitrary set of bytes
(define-public (publish-message (nonce uint) (consistency-level uint) (payload-bytes (buff 2048)) )
    (begin
        (print { nonce: nonce, bytes: payload-bytes, consistency-level: consistency-level })
        (ok u1)))

;;;; Private functions

;; @desc Foldable function parsing a sequence of bytes into a list of { guardian-id: u8, signature: (buff 65) } 
(define-private (batch-read-signatures (element uint) (acc { next: { bytes: (buff 4096), pos: uint }, iter: uint, value: (list 19 { guardian-id: uint, signature: (buff 65) })}))
    (if (is-eq (get iter acc) u0)
        { iter: u0, next: (get next acc), value: (get value acc) }
        (let ((cursor-guardian-id (unwrap-panic (contract-call? .hk-cursor-v1 read-u8 (get next acc))))
              (cursor-signature (unwrap-panic (contract-call? .hk-cursor-v1 read-buff-65 (get next cursor-guardian-id)))))
            { 
                iter: (- (get iter acc) u1), 
                next: (get next cursor-signature), 
                value: 
                  (unwrap-panic (as-max-len? (append (get value acc) { guardian-id: (get value cursor-guardian-id), signature: (get value cursor-signature) }) u19))
            })))

;; @desc Foldable function evaluating signatures from a list of { guardian-id: u8, signature: (buff 65) }, returning a list of recovered public-keys
(define-private (batch-recover-public-keys (entry { guardian-id: uint, signature: (buff 65) }) (acc { message-hash: (buff 32), value: (list 19 { public-key: (response (buff 33) uint), guardian-id: uint }) }))
    (let ((res-recovery (secp256k1-recover? (get message-hash acc) (get signature entry)))
          (updated-public-keys (append (get value acc) { public-key: res-recovery, guardian-id: (get guardian-id entry) } )))
          { 
            message-hash: (get message-hash acc), 
            value: (unwrap-panic (as-max-len? updated-public-keys u19)) 
        }))

;; @desc Foldable function evaluating signatures from a list of { guardian-id: u8, signature: (buff 65) }, returning a list of recovered public-keys
(define-private (batch-check-active-public-keys (entry { public-key: (response (buff 33) uint), guardian-id: uint }) (acc { value: (list 19 (buff 33)) }))
    (match (get public-key entry) 
        public-key (if (is-eq (some public-key) (get public-key (map-get? active-guardians (get guardian-id entry))))
            { value: (unwrap-panic (as-max-len? (append (get value acc) public-key) u19))  }
            acc)
        err acc))
  
;; @desc Foldable function updating a data-map of guardians, given a list of public-keys
(define-private (add-guardian-to-guardian-set (public-key (buff 66)) (acc { id: uint, set-id: uint }))
  (begin
    (map-set active-guardians (get id acc) { public-key: public-key, set-id: (get set-id acc) })
    { id: (+ (get id acc) u1), set-id: (get set-id acc) }))

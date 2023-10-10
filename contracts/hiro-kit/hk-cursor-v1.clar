(define-read-only (read-uint-8 (cursor { bytes: (buff 8192), pos: uint }))
    (ok { 
        value: (buff-to-uint-be (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor) (+ (get pos cursor) u1)) (err u1)) u1) (err u1))), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) u1) }
    }))

(define-read-only (read-uint-16 (cursor { bytes: (buff 8192), pos: uint }))
    (ok { 
        value: (buff-to-uint-be (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor) (+ (get pos cursor) u2)) (err u1)) u2) (err u1))), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) u2) }
    }))

(define-read-only (read-uint-32 (cursor { bytes: (buff 8192), pos: uint }))
    (ok { 
        value: (buff-to-uint-be (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor)  (+ (get pos cursor) u4)) (err u1)) u4) (err u1))), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) u4) }
    }))

(define-read-only (read-uint-64 (cursor { bytes: (buff 8192), pos: uint }))
    (ok { 
        value: (buff-to-uint-be (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor)  (+ (get pos cursor) u8)) (err u1)) u8) (err u1))), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) u8) }
    }))

(define-read-only (read-uint-128 (cursor { bytes: (buff 8192), pos: uint }))
    (ok { 
        value: (buff-to-uint-be (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor)  (+ (get pos cursor) u16)) (err u1)) u16) (err u1))), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) u16) }
    }))

(define-read-only (read-buff-1 (cursor { bytes: (buff 8192), pos: uint }))
    (ok { 
        value: (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor) (+ (get pos cursor) u1)) (err u1)) u1) (err u1)), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) u1) }
    }))

(define-read-only (read-buff-4 (cursor { bytes: (buff 8192), pos: uint }))
    (ok { 
        value: (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor) (+ (get pos cursor) u4)) (err u1)) u4) (err u1)), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) u4) }
    }))

(define-read-only (read-buff-8 (cursor { bytes: (buff 8192), pos: uint }))
    (ok { 
        value: (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor) (+ (get pos cursor) u8)) (err u1)) u8) (err u1)), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) u8) }
    }))

(define-read-only (read-buff-20 (cursor { bytes: (buff 8192), pos: uint }))
    (ok { 
        value: (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor) (+ (get pos cursor) u20)) (err u1)) u20) (err u1)), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) u20) }
    }))

(define-read-only (read-buff-32 (cursor { bytes: (buff 8192), pos: uint }))
    (ok { 
        value: (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor) (+ (get pos cursor) u32)) (err u1)) u32) (err u1)), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) u32) }
    }))

(define-read-only (read-buff-65 (cursor { bytes: (buff 8192), pos: uint }))
    (ok { 
        value: (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor) (+ (get pos cursor) u65)) (err u1)) u65) (err u1)), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) u65) }
    }))

(define-read-only (read-buff-max-len-1024 (cursor { bytes: (buff 8192), pos: uint }) (actual-len uint))
    (ok {
        value: (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor) (+ (get pos cursor) actual-len)) (err u1)) u1024) (err u1)), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) actual-len) }
    }))

(define-read-only (read-buff-max-len-2048 (cursor { bytes: (buff 8192), pos: uint }) (actual-len uint))
    (ok {
        value: (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor) (+ (get pos cursor) actual-len)) (err u1)) u2048) (err u1)), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) actual-len) }
    }))

(define-read-only (read-buff-max-len-8192 (cursor { bytes: (buff 8192), pos: uint }) (actual-len uint))
    (ok {
        value: (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor) (+ (get pos cursor) actual-len)) (err u1)) u8192) (err u1)), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) actual-len) }
    }))

(define-read-only (read-buff-max-len-255 (cursor { bytes: (buff 255), pos: uint }) (actual-len uint))
    (ok {
        value: (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor) (+ (get pos cursor) actual-len)) (err u1)) u255) (err u1)), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) actual-len) }
    }))

(define-read-only (read-buff-max-len-65535 (cursor { bytes: (buff 65535), pos: uint }) (actual-len uint))
    (ok {
        value: (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor) (+ (get pos cursor) actual-len)) (err u1)) u65535) (err u1)), 
        next: { bytes: (get bytes cursor), pos: (+ (get pos cursor) actual-len) }
    }))

(define-read-only (read-remaining-bytes-max-8192 (cursor { bytes: (buff 8192), pos: uint }))
    (ok { 
        value: (unwrap! (as-max-len? (unwrap! (slice? (get bytes cursor) (get pos cursor) (+  (get pos cursor) (- (len (get bytes cursor)) (get pos cursor)))) (err u1)) u8192) (err u1)), 
        next: { bytes: (get bytes cursor), pos: (get pos cursor) }
    }))

(define-read-only (new (bytes (buff 8192)) (offset (optional uint)))
    { 
        value: none, 
        next: { bytes: bytes, pos: (match offset value value u0) }
    })

(define-read-only (advance (cursor { bytes: (buff 8192), pos: uint }) (offset uint))
     { bytes: (get bytes cursor), pos: (+ (get pos cursor) offset) })

(define-read-only (slice (cursor { bytes: (buff 8192), pos: uint }) (size (optional uint)))
    (unwrap-panic (slice? 
        (get bytes cursor) 
        (get pos cursor) 
        (match size 
            value (+ (get pos cursor) value)    
            (+ (get pos cursor) (- (len (get bytes cursor)) (get pos cursor)))))))

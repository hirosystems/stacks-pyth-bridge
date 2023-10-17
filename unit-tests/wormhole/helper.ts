import { fc } from '@fast-check/vitest';
import { bigintToBuffer } from '../utils/helper';
import * as secp from '@noble/secp256k1';
import {
    keccak_256
  } from '@noble/hashes/sha3';
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;
    
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
secp.etc.hmacSha256Sync = (k, ...m) => hmac(sha256, k, secp.etc.concatBytes(...m))

export namespace wormhole_fc {

    export interface Guardian {
        guardianId: number,
        secretKey: Uint8Array,
        compressedPublicKey: Uint8Array,
        uncompressedPublicKey: Uint8Array,
        ethereumAddress: Uint8Array,
    }

    export interface VaaHeader {
        validVersion?: boolean, 
        validGuardianSetId?: boolean,
        signatures?: Uint8Array[],
    }

    export interface VaaHeaderBuildOptions {
        opts?: VaaHeader
    }

    export const generateGuardianSetKeychain = () => {
        let keychain = [];
        for (let i = 0; i < 19; i++) {
            let secretKey = secp.utils.randomPrivateKey();
            let uncompressedPublicKey = secp.getPublicKey(secretKey, false);
            let ethereumAddress = keccak_256(uncompressedPublicKey).slice(12, 32);
            keychain.push({
                guardianId: i,
                secretKey: secretKey,
                uncompressedPublicKey: uncompressedPublicKey,
                ethereumAddress: ethereumAddress,
                compressedPublicKey: secp.getPublicKey(secretKey, true),
            })
        }
        return keychain
    }

    // Helper for generating a VAA Header;
    // Wire format reminder:
    // ===========================
    // VAA Header
    // byte        version             (VAA Version)
    // u32         guardian_set_index  (Indicates which guardian set is signing)
    // u8          len_signatures      (Number of signatures stored)
    // [][66]byte  signatures          (Collection of ecdsa signatures)
    export const vaaHeader = (header?: VaaHeaderBuildOptions) => {
        let args = [];
        if (header && header.opts && header.opts.validVersion) {
            args.push(fc.constant(2))
        } else {
            args.push(fc.nat({ max: 255 }))
        }

        if (header && header.opts && header.opts.validGuardianSetId) {
            args.push(fc.constant(0))
        } else {
            args.push(fc.nat(4294967295));
        }


        if (header && header.opts && header.opts.signatures) {
            // Signatures
            args.push(fc.constant(header.opts.signatures))
            // Random sequences that looks like signatures
            let max = 19 - header.opts.signatures.length  
            let min = 0  
            args.push(fc.array(fc.uint8Array({ minLength: 66, maxLength: 66 }), { minLength: min, maxLength: max }))
        } else {
            // Signatures
            args.push(fc.constant([]))
            // Random sequences that looks like signatures
            let max = 19
            let min = 0  
            args.push(fc.array(fc.uint8Array({ minLength: 66, maxLength: 66 }), { minLength: min, maxLength: max }))
        }
        return args
    }

    export interface VaaBody {
        timestamp: number,
        emitterChain: number,
        nonce: number,
        emitterAddress: Uint8Array,
        sequence: number,
        consistencyLevel: number,
        payload: Uint8Array,
    }

    export interface VaaBodyBuildOptions {
        timestamp?: number,
        emitterChain?: number,
        nonce?: number,
        emitterAddress?: Uint8Array,
        sequence?: number,
        consistencyLevel?: number,
        payload?: Uint8Array,
    }

    // Helper for generating a VAA Body;
    // Wire format reminder:
    // ===========================
    // VAA Body
    // u32         timestamp           (Timestamp of the block where the source transaction occurred)
    // u32         nonce               (A grouping number)
    // u16         emitter_chain       (Wormhole ChainId of emitter contract)
    // [32]byte    emitter_address     (Emitter contract address, in Wormhole format)
    // u64         sequence            (Strictly increasing sequence, tied to emitter address & chain)
    // u8          consistency_level   (What finality level was reached before emitting this message)
    // []byte      payload             (VAA message content)
    export const vaaBody = (vaa?: VaaBodyBuildOptions) => {
        let args = [];
        // Timestamp
        if (vaa && vaa.opts && vaa.opts.timestamp) {
            args.push(fc.constant(vaa.opts.timestamp));
        } else {
            // TODO: what is an invalid timestamp?
            args.push(fc.nat(4294967295));
        }

        // Nonce
        if (vaa && vaa.opts && vaa.opts.nonce) {
            args.push(fc.constant(vaa.opts.nonce));
        } else {
            // TODO: what is an invalid timestamp?
            args.push(fc.nat(4294967295));
        }

        // Emitter chain
        if (vaa && vaa.opts && vaa.opts.emitterChain) {
            args.push(fc.constant(vaa.opts.emitterChain))
        } else {
            args.push(fc.nat(65535));
        }

        // Emitter address
        if (vaa && vaa.opts && vaa.opts.emitterAddress) {
            args.push(fc.constant(vaa.opts.emitterAddress))
        } else {
            args.push(fc.uint8Array({ minLength: 32, maxLength: 32 }));
        }

        // Sequence
        if (vaa && vaa.opts && vaa.opts.sequence) {
            args.push(fc.constant(vaa.opts.sequence))
        } else {
            args.push(fc.bigUintN(64));
        }

        // Consistency level
        if (vaa && vaa.opts && vaa.opts.consistencyLevel) {
            args.push(fc.constant(vaa.opts.consistencyLevel))
        } else {
            args.push(fc.nat(255));
        }
        
        // Payload
        if (vaa && vaa.opts && vaa.opts.payload) {
            args.push(fc.constant(vaa.opts.payload))
        } else {
            args.push(fc.uint8Array({ minLength: 20, maxLength: 2048 }));
        }

        return args;
    }

    export const vaa = (opts: { keyChain?: Guardian[], body: VaaBody, validSig: boolean }) => {
        let signatures = [];
        if (opts.validSig && opts.keyChain && opts.validSig === true) {
            for (let guardian of opts.keyChain) {
                const messageHash = keccak_256(keccak_256(opts.body..payload));
                const signature = secp.sign(messageHash, guardian.secretKey)

                const id = Buffer.alloc(1); 
                id.writeUint8(guardian.guardianId, 0);

                // v.writeUint8(signature.addRecoveryBit, 1);
                if (signature.recovery) {
                    const rec = Buffer.alloc(1); 
                    rec.writeUint8(signature.recovery, 0);
                    signatures.push(Buffer.concat([id, signature.toCompactRawBytes(), rec]));
                } else {
                    console.log(`-> ${guardian.guardianId} / ${guardian.compressedPublicKey}`);
                    const rec = Buffer.alloc(1); 
                    rec.writeUint8(0, 0);
                    signatures.push(Buffer.concat([id, signature.toCompactRawBytes(), rec]));
                }
            }
        }

        return [
            ...vaaHeader({ opts: { 
                validVersion: true, 
                validGuardianSetId: true,
                signatures: signatures,
            }}), 
             ...vaaBody({
                opts: {
                    timestamp: 0,
                    emitterChain: 0,
                    nonce: 0,
                    emitterAddress: ,
                    sequence: 0,
                    consistencyLevel: 0,
                    payload: opts.payload
                }
             })]
    }

    export const serializeVaa = (version: number, guardianSetIndex: number, signatures: Uint8Array[], timestamp: number, nonce: number, emitterChain: number, emitterAddress: Uint8Array, sequence: bigint, consistencyLevel: number, payload: Uint8Array) => {
        const components = [];
        var v = Buffer.alloc(1); 
        v.writeUint8(version, 0);
        components.push(v);

        v = Buffer.alloc(4); 
        v.writeUInt32BE(guardianSetIndex, 0);
        components.push(v);

        v = Buffer.alloc(1);
        v.writeUint8(signatures.length, 0);
        components.push(v);

        components.push(Buffer.concat(signatures));
        
        v = Buffer.alloc(4); 
        v.writeUInt32BE(timestamp, 0);
        components.push(v);

        v = Buffer.alloc(4); 
        v.writeUInt32BE(nonce, 0);
        components.push(v);

        v = Buffer.alloc(2); 
        v.writeUInt16BE(emitterChain, 0);
        components.push(v);

        components.push(emitterAddress);

        components.push(bigintToBuffer(sequence, 64));

        v = Buffer.alloc(1);
        v.writeUint8(consistencyLevel, 0);
        components.push(v);

        components.push(payload);

        return Buffer.concat(components); 
    }




//     (define-public (update-guardians-set (guardian-set-vaa (buff 2048)) (uncompressed-public-keys (list 19 (buff 64))))
//   (let ((vaa (if (var-get guardian-set-initialized)
//           (try! (parse-and-verify-vaa guardian-set-vaa))
//           (try! (parse-vaa guardian-set-vaa))))
//         (cursor-guardians-data (try! (parse-and-verify-guardians-set (get payload vaa))))
//         (set-id (get new-index (get value cursor-guardians-data)))
//         (eth-addresses (get guardians-eth-addresses (get value cursor-guardians-data)))
//         (acc (unwrap-panic (as-max-len? (list { 
//           compressed-public-key: (unwrap-panic (as-max-len? 0x u33)), 
//           uncompressed-public-key: (unwrap-panic (as-max-len? 0x u64))
//         }) u20)))
//         (consolidated-public-keys (fold 
//           check-and-consolidate-public-keys 
//           uncompressed-public-keys 
//           { success: true, cursor: u0, eth-addresses: eth-addresses, result: acc }))
//         )
//     ;; Ensure that enough uncompressed-public-keys were provided
//     (asserts! (is-eq (len uncompressed-public-keys) (len eth-addresses)) 
//       ERR_GSU_UNCOMPRESSED_PUBLIC_KEYS)
//     ;; Check guardians uncompressed-public-keys
//     (asserts! (get success consolidated-public-keys)
//       ERR_GSU_UNCOMPRESSED_PUBLIC_KEYS)

//     (map-set guardian-sets { set-id: set-id } 
//       (unwrap-panic (as-max-len? 
//         (unwrap-panic (slice? (get result consolidated-public-keys) u1 (len (get result consolidated-public-keys)))) 
//         u19)))
//     (var-set active-guardian-set-id set-id)
//     (var-set guardian-set-initialized true)
//     (ok {
//       vaa: vaa,
//       consolidated-public-keys: consolidated-public-keys,


// ((cursor-module (unwrap! (contract-call? .hk-cursor-v1 read-buff-32 { bytes: bytes, pos: u0 }) 
// ERR_GSU_PARSING_MODULE))
// (cursor-action (unwrap! (contract-call? .hk-cursor-v1 read-uint-8 (get next cursor-module)) 
// ERR_GSU_PARSING_ACTION))
// (cursor-chain (unwrap! (contract-call? .hk-cursor-v1 read-uint-16 (get next cursor-action)) 
// ERR_GSU_PARSING_CHAIN))
// (cursor-new-index (unwrap! (contract-call? .hk-cursor-v1 read-uint-32 (get next cursor-chain)) 
// ERR_GSU_PARSING_INDEX))
// (cursor-guardians-count (unwrap! (contract-call? .hk-cursor-v1 read-uint-8 (get next cursor-new-index)) 
// ERR_GSU_PARSING_GUARDIAN_LEN))
// (guardians-bytes (unwrap! (slice? bytes (get pos (get next cursor-guardians-count)) (+ (get pos (get next cursor-guardians-count)) (* (get value cursor-guardians-count) u20)))
// ERR_GSU_PARSING_GUARDIANS_BYTES))
// (guardians-cues (get result (fold is-guardian-cue guardians-bytes { cursor: u0, result: (unwrap-panic (as-max-len? (list u0) u19)) })))
// (eth-addresses-init (unwrap-panic (as-max-len? (list (unwrap-panic (as-max-len? 0x u20))) u19)))
// (eth-addresses (get result (fold parse-guardian guardians-cues { bytes: guardians-bytes, result: eth-addresses-init }))))
// ;; Ensure that this message was emitted from authorized module
// (asserts! (is-eq (get value cursor-module) 0x00000000000000000000000000000000000000000000000000000000436f7265) 
// ERR_GSU_CHECK_MODULE)
// ;; Ensure that this message is matching the adequate action
// (asserts! (is-eq (get value cursor-action) u2) 
// ERR_GSU_CHECK_ACTION)
// ;; Ensure that this message is matching the adequate action
// (asserts! (is-eq (get value cursor-chain) u0) 
// ERR_GSU_CHECK_CHAIN)

    export const buildGuardianRotationVaaPayload = (keyChain: Guardian[], module: number, action: number, chain: number, setId: number) => {
        const components = [];
        var v = Buffer.alloc(4); 
        v.writeUInt32BE(module, 0);
        components.push(v);

        v = Buffer.alloc(1);
        v.writeUint8(action, 0);
        components.push(v);

        v = Buffer.alloc(2);
        v.writeUInt16BE(chain, 0);
        components.push(v);

        v = Buffer.alloc(4); 
        v.writeUInt32BE(setId, 0);
        components.push(v);

        v = Buffer.alloc(1);
        v.writeUint8(keyChain.length, 0);
        components.push(v);

        for (let guardian of keyChain) {
            components.push(guardian.ethereumAddress)
        }

        return Buffer.concat(components); 
    }
}

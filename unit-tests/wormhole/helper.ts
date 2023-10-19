import { fc } from '@fast-check/vitest';
import { tx } from "@hirosystems/clarinet-sdk";
import { Cl, ClarityValue } from "@stacks/transactions";
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
import { gsuMainnetVaas } from './fixtures';

secp.etc.hmacSha256Sync = (k, ...m) => hmac(sha256, k, secp.etc.concatBytes(...m))

export namespace wormhole {

    export interface Guardian {
        guardianId: number,
        secretKey: Uint8Array,
        compressedPublicKey: Uint8Array,
        uncompressedPublicKey: Uint8Array,
        ethereumAddress: Uint8Array,
    }

    export const generateGuardianSetKeychain = (count = 19): Guardian[] => {
        let keychain = [];
        for (let i = 0; i < count; i++) {
            let secretKey = secp.utils.randomPrivateKey();
            let uncompressedPublicKey = secp.getPublicKey(secretKey, false).slice(1, 65);
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

    export interface VaaHeader {
        version: number,
        guardianSetId: number,
        signatures: Uint8Array[],
    }

    export interface VaaBody {
        timestamp: number,
        emitterChain: number,
        nonce: number,
        emitterAddress: Uint8Array,
        sequence: bigint,
        consistencyLevel: number,
        payload: Uint8Array,
    }

    export interface VaaHeaderBuildOptions {
        version?: number,
        guardianSetId?: number,
        signatures?: Uint8Array[],
    }

    export interface VaaBodyBuildOptions {
        timestamp?: number,
        emitterChain?: number,
        nonce?: number,
        emitterAddress?: Uint8Array,
        sequence?: bigint,
        consistencyLevel?: number,
        payload?: Uint8Array,
    }

    export namespace fc_ext {
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
        export const vaaBody = (opts?: VaaBodyBuildOptions) => {
            // Timestamp
            let timestamp = fc.nat(4294967295);
            if (opts && opts.timestamp) {
                timestamp = fc.constant(opts.timestamp);
            }

            // Nonce
            let nonce = fc.nat(4294967295);
            if (opts && opts.nonce) {
                nonce = fc.constant(opts.nonce);
            }

            // Emitter chain
            let emitterChain = fc.nat(65535);
            if (opts && opts.emitterChain) {
                emitterChain = fc.constant(opts.emitterChain);
            }

            // Emitter address
            let emitterAddress = fc.uint8Array({ minLength: 32, maxLength: 32 });
            if (opts && opts.emitterAddress) {
                emitterAddress = fc.constant(opts.emitterAddress);
            }

            // Sequence
            let sequence = fc.bigUintN(64);
            if (opts && opts.sequence) {
                sequence = fc.constant(opts.sequence)
            }

            // Consistency level
            let consistencyLevel = fc.nat(255);
            if (opts && opts.consistencyLevel) {
                consistencyLevel = fc.constant(opts.consistencyLevel)
            }

            // Payload
            let payload = fc.uint8Array({ minLength: 20, maxLength: 2048 });
            if (opts && opts.payload) {
                payload = fc.constant(opts.payload)
            }

            return fc.tuple(timestamp, nonce, emitterChain, emitterAddress, sequence, consistencyLevel, payload);
        }

        // Helper for generating a VAA Header;
        // Wire format reminder:
        // ===========================
        // VAA Header
        // byte        version             (VAA Version)
        // u32         guardian_set_index  (Indicates which guardian set is signing)
        // u8          len_signatures      (Number of signatures stored)
        // [][66]byte  signatures          (Collection of ecdsa signatures)
        export const vaaHeader = (opts?: VaaHeaderBuildOptions, numberOfSignatures = 19) => {
            // Version
            let version = fc.nat(255);
            if (opts && opts.version) {
                version = fc.constant(opts.version);
            }

            // Guardian set id
            let guardianSetId = fc.nat(255);
            if (opts && opts.guardianSetId) {
                guardianSetId = fc.constant(opts.guardianSetId)
            }

            // Specified signatures
            let specifiedSignatures = fc.array(fc.uint8Array({ minLength: 66, maxLength: 66 }), { minLength: 0, maxLength: 0 })
            let specifiedSignaturesLen = 0;
            if (opts && opts.signatures) {
                specifiedSignatures = fc.constant(opts.signatures)
                specifiedSignaturesLen = opts.signatures.length
            }

            // Generated signatures
            let generatedSignatures = fc.array(fc.uint8Array({ minLength: 66, maxLength: 66 }), { minLength: 0, maxLength: (numberOfSignatures - specifiedSignaturesLen) })

            return fc.tuple(version, guardianSetId, specifiedSignatures, generatedSignatures);
        }
    }

    export const buildValidVaaHeaderSpecs = (keychain: Guardian[], body: VaaBody, opts?: VaaHeaderBuildOptions): VaaHeaderBuildOptions => {

        let signatures = [];
        const messageHash = keccak_256(keccak_256(serializeVaaBody(body)));

        for (let guardian of keychain) {
            const signature = secp.sign(messageHash, guardian.secretKey)

            const id = Buffer.alloc(1);
            id.writeUint8(guardian.guardianId, 0);

            // v.writeUint8(signature.addRecoveryBit, 1);
            if (signature.recovery) {
                const rec = Buffer.alloc(1);
                rec.writeUint8(signature.recovery, 0);
                signatures.push(Buffer.concat([id, signature.toCompactRawBytes(), rec]));
            } else {
                const rec = Buffer.alloc(1);
                rec.writeUint8(0, 0);
                signatures.push(Buffer.concat([id, signature.toCompactRawBytes(), rec]));
            }
        }
        return {
            version: opts?.version,
            guardianSetId: opts?.guardianSetId,
            signatures: signatures,
        }
    }

    export const buildValidVaaHeader = (keychain: Guardian[], body: VaaBody, opts: VaaHeaderBuildOptions): VaaHeader => {
        let specs = buildValidVaaHeaderSpecs(keychain, body, opts);
        return {
            version: specs.version!,
            guardianSetId: specs.guardianSetId!,
            signatures: specs.signatures!,
        }
    }

    export const expectedDecodedVaa = (header: VaaHeader, body: VaaBody, keychain: Guardian[]): [ClarityValue, any[]] => {
        let guardiansPublicKeys = [];
        let guardiansSignatures = [];
        for (let i = 0; i < header.signatures.length; i++) {
            let guardianId = header.signatures[i][0];
            if (keychain.length > i) {
                let guardian = keychain[i];
                guardiansPublicKeys.push(Cl.tuple({
                    "guardian-id": Cl.uint(guardianId),
                    "recovered-compressed-public-key": Cl.buffer(guardian.compressedPublicKey)
                }))
            }
            guardiansSignatures.push(Cl.tuple({
                "guardian-id": Cl.uint(header.signatures[i].slice(0, 1)),
                "signature": Cl.buffer(header.signatures[i].slice(1, 66))
            }))
        }
        let value = Cl.tuple({
            "consistency-level": Cl.uint(body.consistencyLevel),
            "version": Cl.uint(header.version),
            "guardian-set-id": Cl.uint(header.guardianSetId),
            "signatures-len": Cl.uint(header.signatures.length),
            "signatures": Cl.list(guardiansSignatures),
            "emitter-chain": Cl.uint(body.emitterChain),
            "emitter-address": Cl.buffer(body.emitterAddress),
            "sequence": Cl.uint(body.sequence),
            "timestamp": Cl.uint(body.timestamp),
            "nonce": Cl.uint(body.nonce),
            "payload": Cl.buffer(body.payload)
        })
        return [value, guardiansPublicKeys]
    }

    export interface VaaBodySpec {
        values: VaaBody,
        specs: (fc.Arbitrary<number> | fc.Arbitrary<Uint8Array> | fc.Arbitrary<Uint8Array[]> | fc.Arbitrary<bigint>)[]
    }

    export const buildValidVaaBodySpecs = (opts?: { payload?: Uint8Array }): VaaBody => {
        const date = Math.floor(Date.now() / 1000);
        const timestamp = date >>> 0;
        const payload = (opts && opts.payload && opts.payload) || new Uint8Array(32)
        let values = {
            timestamp: timestamp,
            nonce: 0,
            emitterChain: 0,
            emitterAddress: new Uint8Array(32),
            sequence: 0n,
            consistencyLevel: 0,
            payload: payload,
        };
        return values
    }

    export const assembleVaaBody = (timestamp: number | bigint | Uint8Array, nonce: number | bigint | Uint8Array, emitterChain: number | bigint | Uint8Array, emitterAddress: number | bigint | Uint8Array, sequence: number | bigint | Uint8Array, consistencyLevel: number | bigint | Uint8Array, payload: number | bigint | Uint8Array): VaaBody => {
        return {
            timestamp: timestamp as number,
            nonce: nonce as number,
            emitterChain: emitterChain as number,
            emitterAddress: emitterAddress as Uint8Array,
            sequence: sequence as bigint,
            consistencyLevel: consistencyLevel as number,
            payload: payload as Uint8Array
        }
    }

    export const assembleVaaHeader = (version: number | bigint | Uint8Array, guardianSetId: number | bigint | Uint8Array, signatures: number | bigint | Uint8Array[]): VaaHeader => {
        return {
            version: version as number,
            guardianSetId: guardianSetId as number,
            signatures: signatures as Uint8Array[],
        }
    }

    export const serializeVaa = (vaaHeader: VaaHeader, vaaBody: VaaBody) => {
        return Buffer.concat([serializeVaaHeader(vaaHeader), serializeVaaBody(vaaBody)]);
    }

    export const serializeVaaHeader = (vaaHeader: VaaHeader) => {
        const components = [];
        var v = Buffer.alloc(1);
        v.writeUint8(vaaHeader.version, 0);
        components.push(v);

        v = Buffer.alloc(4);
        v.writeUInt32BE(vaaHeader.guardianSetId, 0);
        components.push(v);

        v = Buffer.alloc(1);
        v.writeUint8(vaaHeader.signatures.length, 0);
        components.push(v);

        components.push(Buffer.concat(vaaHeader.signatures));
        return Buffer.concat(components);
    }

    export const serializeVaaBody = (vaaBody: VaaBody) => {
        const components = [];
        let v = Buffer.alloc(4);
        v.writeUInt32BE(vaaBody.timestamp, 0);
        components.push(v);

        v = Buffer.alloc(4);
        v.writeUInt32BE(vaaBody.nonce, 0);
        components.push(v);

        v = Buffer.alloc(2);
        v.writeUInt16BE(vaaBody.emitterChain, 0);
        components.push(v);

        components.push(vaaBody.emitterAddress);

        components.push(bigintToBuffer(vaaBody.sequence, 8));

        v = Buffer.alloc(1);
        v.writeUint8(vaaBody.consistencyLevel, 0);
        components.push(v);

        components.push(vaaBody.payload);

        return Buffer.concat(components);
    }

    export const validGuardianRotationModule = Buffer.from('00000000000000000000000000000000000000000000000000000000436f7265', 'hex');

    export const buildGuardianRotationVaaPayload = (keyChain: Guardian[], action: number, chain: number, setId: number, module = validGuardianRotationModule) => {
        const components = [];
        components.push(module);

        let v = Buffer.alloc(1);
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

    export function applyGuardianSetUpdate(keychain: wormhole.Guardian[], guardianSetId: number, txSenderAddress: string, contract_name: string) {
        let guardianRotationPayload = wormhole.buildGuardianRotationVaaPayload(keychain, 2, 0, guardianSetId, wormhole.validGuardianRotationModule);
        let vaaBody = wormhole.buildValidVaaBodySpecs({ payload: guardianRotationPayload });
        let vaaHeader = wormhole.buildValidVaaHeader(keychain, vaaBody, { version: 1, guardianSetId: guardianSetId - 1 });
        let vaa = wormhole.serializeVaa(vaaHeader, vaaBody);
        let uncompressedPublicKey = [];
        for (let guardian of keychain) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        let result = simnet.mineBlock([
            tx.callPublicFn(
                contract_name,
                `update-guardians-set`,
                [Cl.buffer(vaa), Cl.list(uncompressedPublicKey)],
                txSenderAddress
            ),
        ])[0].result;
        return [result, vaaHeader, vaaBody]
    }

    export function applyMainnetGuardianSetUpdates(txSenderAddress: string, contractName: string) {
        const vaaRotation1 = Cl.bufferFromHex(gsuMainnetVaas[0].vaa);
        let publicKeysRotation1 = gsuMainnetVaas[0].keys.map(Cl.bufferFromHex);

        const vaaRotation2 = Cl.bufferFromHex(gsuMainnetVaas[1].vaa);
        let publicKeysRotation2 = gsuMainnetVaas[1].keys.map(Cl.bufferFromHex);

        const vaaRotation3 = Cl.bufferFromHex(gsuMainnetVaas[2].vaa);
        let publicKeysRotation3 = gsuMainnetVaas[2].keys.map(Cl.bufferFromHex);

        const block = simnet.mineBlock([
            tx.callPublicFn(
                contractName,
                "update-guardians-set",
                [vaaRotation1, Cl.list(publicKeysRotation1)],
                txSenderAddress
            ),
            tx.callPublicFn(
                contractName,
                "update-guardians-set",
                [vaaRotation2, Cl.list(publicKeysRotation2)],
                txSenderAddress
            ),
            tx.callPublicFn(
                contractName,
                "update-guardians-set",
                [vaaRotation3, Cl.list(publicKeysRotation3)],
                txSenderAddress
            ),
        ]);
        return block;
    }
}

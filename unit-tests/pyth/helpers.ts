import { fc } from '@fast-check/vitest';
import { Cl, ClarityValue } from "@stacks/transactions";
import { bigintToBuffer, bufferToBigint } from '../utils/helpers';
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

export namespace pyth {

    export interface PriceUpdate {
        priceIdentifier: Uint8Array,
        price: bigint,
        conf: bigint,
        emaPrice: bigint,
        emaConf: bigint,
        expo: number,
        publishTime: bigint,
        prevPublishTime: bigint,
        proof: Uint8Array,
    }

    export interface PriceUpdateBuildOptions {
        price?: bigint,
        conf?: bigint,
        emaPrice?: bigint,
        emaConf?: bigint,
        expo?: number,
        publishTime?: bigint,
        prevPublishTime?: bigint,
    }

    export interface AuwvVaaPayload {
        payloadType: Uint8Array,
        updateType: number,
        merkleRootSlot: bigint,
        merkleRootRingSize: number,
        merkleRootHash: Uint8Array
    }

    export interface AuwvVaaPayloadBuildOptions {
        payloadType?: Uint8Array,
        updateType?: number,
        merkleRootSlot?: bigint,
        merkleRootRingSize?: number,
        merkleRootHash?: Uint8Array
    }

    export interface PnauHeader {
        magicBytes: Uint8Array,
        versionMaj: number,
        versionMin: number,
        trailingSize: number,
        proofType: number,
    }

    export interface PnauHeaderBuildOptions {
        magicBytes?: Uint8Array,
        versionMaj?: number,
        versionMin?: number,
        trailingSize?: number,
        proofType?: number,
    }

    export interface PnauBody {
        vaa: Uint8Array,
        pricesUpdates: PriceUpdateBatch,
    }

    export interface PriceUpdateBatch {
        decoded: PriceUpdate[],
        serialized: Uint8Array[],
        hashed: Uint8Array[],
    }

    export const BtcPriceIdentifier = Buffer.from('e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', 'hex')
    export const StxPriceIdentifier = Buffer.from('ec7a775f46379b5e943c3526b1c8d54cd49749176b0b98e02dde68d1bd335c17', 'hex')

    export function serializePriceUpdateToClarityValue(priceUpdate: PriceUpdate): ClarityValue {
        return Cl.tuple({
            "price-identifier": Cl.buffer(priceUpdate.priceIdentifier),
            "conf": Cl.uint(priceUpdate.conf),
            "ema-conf": Cl.uint(priceUpdate.emaConf),
            "ema-price": Cl.int(priceUpdate.emaPrice),
            "expo": Cl.int(priceUpdate.expo),
            "prev-publish-time": Cl.uint(priceUpdate.prevPublishTime),
            "price": Cl.int(priceUpdate.price),
            "publish-time": Cl.uint(priceUpdate.publishTime)
        })
    }

    export function preserializePriceUpdateToBuffer(priceUpdate: PriceUpdate): Uint8Array {
        const components = [];
        components.push(priceUpdate.priceIdentifier);
        components.push(bigintToBuffer(priceUpdate.price, 8));
        components.push(bigintToBuffer(priceUpdate.conf, 8));
        let v = Buffer.alloc(4);
        v.writeInt32BE(priceUpdate.expo, 0);
        components.push(v);
        components.push(bigintToBuffer(priceUpdate.publishTime, 8));
        components.push(bigintToBuffer(priceUpdate.prevPublishTime, 8));
        components.push(bigintToBuffer(priceUpdate.emaPrice, 8));
        components.push(bigintToBuffer(priceUpdate.emaConf, 8));
        return Buffer.concat(components);
    }

    export function serializePriceUpdateToBuffer(priceUpdate: PriceUpdate, proof: Uint8Array): Uint8Array {
        const components = [];
        
        // Update type
        var v = Buffer.alloc(1);
        v.writeUint8(1, 0);
        components.push(v);

        // Size
        let priceUpdateData = preserializePriceUpdateToBuffer(priceUpdate);
        let messageSize = priceUpdateData.length;
        var v = Buffer.alloc(2);
        v.writeUint16BE(messageSize, 0);
        components.push(v);

        // Price update data
        components.push(priceUpdateData)

        // Proof size
        var v = Buffer.alloc(1);
        v.writeUint8(proof.length, 0);
        components.push(v);

        // Proof
        components.push(proof)
        return Buffer.concat(components);
    }

    export function serializeAuwvVaaPayloadToBuffer(payload: AuwvVaaPayload): Uint8Array {
        const components = [];
        // Magic bytes ('AUWV')
        components.push(payload.payloadType);
        // Update type
        let v = Buffer.alloc(1);
        v.writeUint8(payload.updateType, 0);
        components.push(v);
        // Merkle root slot
        components.push(bigintToBuffer(payload.merkleRootSlot, 8));
        // Merkle ring size
        v = Buffer.alloc(4);
        v.writeUint16BE(payload.merkleRootRingSize, 0);
        components.push(v);
        // Merkle root
        components.push(payload.merkleRootHash);
        return Buffer.concat(components)
    }

    export function buildPriceUpdateBatch(pricesUpdatesSpecs: [priceIdentifier: Uint8Array, opts?: PriceUpdateBuildOptions][]): PriceUpdateBatch {
        let decoded = [];
        let serialized = [];
        let hashed = [];
        for (let [priceIdentifier, opts] of pricesUpdatesSpecs) {
            let p = buildPriceUpdate(priceIdentifier, opts);
            let s = preserializePriceUpdateToBuffer(p);
            decoded.push(p)
            serialized.push(s)
            hashed.push(keccak160HashLeaf(s))
        }
        return {
            decoded,
            serialized,
            hashed
        } 
    }

    export function buildAuwvVaaPayload(batch: PriceUpdateBatch, merkleRootData?: AuwvVaaPayloadBuildOptions) {
        let merkleLeaves = [...batch.hashed];
        // Compute merkle tree
        while (merkleLeaves.length > 1) {
            let newLeaves = [];
            // Loop through adjacent pairs
            for (let i = 0; i < merkleLeaves.length; i += 2) {
              const leftLeaf = merkleLeaves[i];
               // Duplicate the last one if odd number of leaves
              const rightLeaf = merkleLeaves[i + 1] || leftLeaf;        
              newLeaves.push(keccak160HashNodes(leftLeaf, rightLeaf));
            }
            merkleLeaves = newLeaves;
        }

        return {
            payloadType: merkleRootData?.payloadType || new Uint8Array(Buffer.from('41555756', 'hex')),
            updateType: merkleRootData?.updateType || 0,
            merkleRootRingSize: merkleRootData?.merkleRootRingSize || 0,
            merkleRootSlot: merkleRootData?.merkleRootSlot || 0n,
            merkleRootHash: merkleLeaves[0]
        }
    }

    export function buildPnauHeader(opts?: PnauHeaderBuildOptions) {
        return {
            magicBytes: opts?.magicBytes || new Uint8Array(Buffer.from('504e4155', 'hex')),
            versionMaj: opts?.versionMaj || 1,
            versionMin: opts?.versionMin || 0,
            trailingSize: opts?.trailingSize || 0,
            proofType: opts?.proofType || 0,
        }
    }

    export function buildPnauBody(serializedVaa: Uint8Array, batch: PriceUpdateBatch): PnauBody {
        // let merkleLeaves = [...batch.hashed];
        // // Compute merkle tree
        // while (merkleLeaves.length > 1) {
        //     let newLeaves = [];
        //     // Loop through adjacent pairs
        //     for (let i = 0; i < merkleLeaves.length; i += 2) {
        //       const leftLeaf = merkleLeaves[i];
        //        // Duplicate the last one if odd number of leaves
        //       const rightLeaf = merkleLeaves[i + 1] || leftLeaf;        
        //       newLeaves.push(keccak160HashNodes(leftLeaf, rightLeaf));
        //     }
        //     merkleLeaves = newLeaves;
        // }

        // TODO: For each price in batch, build the proof

        return {
            vaa: serializedVaa,
            pricesUpdates: batch
        }
    }

    export function serializePnauToBuffer(pnauHeader: PnauHeader, pnauBody: PnauBody) {
        const components = [];
        // Magic bytes
        components.push(pnauHeader.magicBytes);
        // Version Maj
        let v = Buffer.alloc(1);
        v.writeUint8(pnauHeader.versionMaj, 0);
        components.push(v);
        // Version Min
        v = Buffer.alloc(1);
        v.writeUint8(pnauHeader.versionMin, 0);
        components.push(v);
        // Trailing header
        v = Buffer.alloc(1);
        v.writeUint8(pnauHeader.trailingSize, 0);
        components.push(v);
        // Proof type
        v = Buffer.alloc(1);
        v.writeUint8(pnauHeader.proofType, 0);
        components.push(v);
        // VAA size
        v = Buffer.alloc(2);
        v.writeUint16BE(pnauBody.vaa.length, 0);
        components.push(v);
        // Vaa
        components.push(pnauBody.vaa);
        return Buffer.concat(components)
    }

    function keccak160HashNodes(node1: Uint8Array, node2: Uint8Array): Uint8Array {
        let prefix = new Uint8Array([1]);
        if (bufferToBigint(node2) < bufferToBigint(node1)) {
            return keccak_256(Buffer.concat([prefix, node2, node1])).slice(0, 20)
        } else {
            return keccak_256(Buffer.concat([prefix, node1, node2])).slice(0, 20)
        }
    }

    function keccak160HashLeaf(leaf: Uint8Array): Uint8Array {
        let prefix = new Uint8Array([0]);
        return keccak_256(Buffer.concat([prefix, leaf])).slice(0, 20)
    }

    export function buildPriceUpdate(priceIdentifier: Uint8Array, opts?: PriceUpdateBuildOptions):PriceUpdate {
        return {
            priceIdentifier: priceIdentifier,
            price: opts?.price || 100n,
            conf: opts?.conf || 10n,
            emaPrice: opts?.emaPrice || 95n,
            emaConf: opts?.emaConf || 9n,
            expo: -4,
            publishTime: opts?.publishTime || 10000001n,
            prevPublishTime: opts?.prevPublishTime || 10000000n,
            proof: new Uint8Array(0),
        }
    }

    export namespace fc_ext {

        export const priceUpdate = (opts?: PriceUpdateBuildOptions) => {
            // price
            let price = fc.bigIntN(64);
            if (opts && opts.price) {
                price = fc.constant(opts.price);
            }

            // conf
            let conf = fc.bigUintN(64);
            if (opts && opts.conf) {
                conf = fc.constant(opts.conf);
            }

            // emaPrice
            let emaPrice = fc.bigIntN(64);
            if (opts && opts.emaPrice) {
                emaPrice = fc.constant(opts.emaPrice);
            }

            // emaConf
            let emaConf = fc.bigUintN(64);
            if (opts && opts.emaConf) {
                emaConf = fc.constant(opts.emaConf);
            }

            // expo
            let expo = fc.nat(4294967295);
            if (opts && opts.expo) {
                expo = fc.constant(opts.expo);
            }

            // prevPublishTime
            let prevPublishTime = fc.bigUintN(64);
            if (opts && opts.prevPublishTime) {
                prevPublishTime = fc.constant(opts.prevPublishTime);
            }

            // prevPublishTime
            let publishTime = prevPublishTime.chain((t: bigint) =>  fc.constant(t + 10n));
            if (opts && opts.publishTime) {
                publishTime = fc.constant(opts.publishTime);
            }
            
            return fc.tuple(price, conf, emaPrice, emaConf, expo, prevPublishTime, publishTime);
        }
    }
}

import { fc } from "@fast-check/vitest";
import {
  Cl,
  ClarityValue,
  contractPrincipalCV,
  cvToHex,
  principalCV,
} from "@stacks/transactions";
import { bigintToBuffer, bufferToBigint } from "../utils/helpers";
import * as secp from "@noble/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";
import { webcrypto } from "node:crypto";
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { wormhole } from "../wormhole/helpers";
import { hexToBytes } from "@noble/hashes/utils";

secp.etc.hmacSha256Sync = (k, ...m) =>
  hmac(sha256, k, secp.etc.concatBytes(...m));

export namespace pyth {
  export const BtcPriceIdentifier = Buffer.from(
    "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    "hex",
  );
  export const StxPriceIdentifier = Buffer.from(
    "ec7a775f46379b5e943c3526b1c8d54cd49749176b0b98e02dde68d1bd335c17",
    "hex",
  );
  export const BatPriceIdentifer = Buffer.from(
    "8e860fb74e60e5736b455d82f60b3728049c348e94961add5f961b02fdee2535",
    "hex",
  );
  export const DaiPriceIdentifer = Buffer.from(
    "b0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd",
    "hex",
  );
  export const UsdcPriceIdentifer = Buffer.from(
    "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
    "hex",
  );
  export const UsdtPriceIdentifer = Buffer.from(
    "2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
    "hex",
  );
  export const WbtcPriceIdentifer = Buffer.from(
    "c9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33",
    "hex",
  );
  export const TbtcPriceIdentifer = Buffer.from(
    "56a3121958b01f99fdc4e1fd01e81050602c7ace3a571918bb55c6a96657cca9",
    "hex",
  );

  export const PnauMagicBytes = new Uint8Array(Buffer.from("504e4155", "hex"));
  export const AuwvMagicBytes = new Uint8Array(Buffer.from("41555756", "hex"));
  export const PgtmMagicBytes = new Uint8Array(Buffer.from("5054474d", "hex"));
  export const InitialGovernanceDataSource = {
    chain: 0,
    address: hexToBytes(
      "0000000000000000000000000000000000000000000000000000000000000000",
    ),
  };
  export const DefaultGovernanceDataSource = {
    chain: 1,
    address: hexToBytes(
      "0000000000000000000000000000000000000000000000000000000000000001",
    ),
  };
  export const DefaultPricesDataSources = [
    {
      chain: 2,
      address: hexToBytes(
        "0000000000000000000000000000000000000000000000000000000000000004",
      ),
    },
    {
      chain: 3,
      address: hexToBytes(
        "0000000000000000000000000000000000000000000000000000000000000006",
      ),
    },
  ];

  export interface PriceUpdate {
    priceIdentifier: Uint8Array;
    price: bigint;
    conf: bigint;
    emaPrice: bigint;
    emaConf: bigint;
    expo: number;
    publishTime: bigint;
    prevPublishTime: bigint;
  }

  export interface PriceUpdateBuildOptions {
    price?: bigint;
    conf?: bigint;
    emaPrice?: bigint;
    emaConf?: bigint;
    expo?: number;
    publishTime?: bigint;
    prevPublishTime?: bigint;
  }

  export interface AuwvVaaPayload {
    payloadType: Uint8Array;
    updateType: number;
    merkleRootSlot: bigint;
    merkleRootRingSize: number;
    merkleRootHash: Uint8Array;
  }

  export interface AuwvVaaPayloadBuildOptions {
    payloadType?: Uint8Array;
    updateType?: number;
    merkleRootSlot?: bigint;
    merkleRootRingSize?: number;
    merkleRootHash?: Uint8Array;
  }

  export interface PtgmVaaPayload {
    magicBytes: Uint8Array;
    module: number;
    action: number;
    targetChainId: number;
    updateFeeValue?: PtgmUpdateFeeValue;
    updateFeeRecipient?: PtgmUpdateFeeRecipient;
    updateWormholeContract?: PtgmUpdateContract;
    updateOracleContract?: PtgmUpdateContract;
    updateStoreContract?: PtgmUpdateContract;
    updateDecoderContract?: PtgmUpdateContract;
    updatePricesDataSources?: wormhole.Emitter[];
    updateGovernanceDataSource?: wormhole.Emitter;
  }

  export interface PtgmUpdateFeeValue {
    mantissa: bigint;
    exponent: bigint;
  }

  export interface PtgmUpdateFeeRecipient {
    address: string;
    contractName?: string;
  }

  export interface PtgmUpdateContract {
    address: string;
    contractName: string;
  }

  export interface PtgmVaaPayloadBuildOptions {
    magicBytes?: Uint8Array;
    module?: number;
    action?: number;
    targetChainId?: number;
    updateFeeValue?: PtgmUpdateFeeValue;
    updateFeeRecipient?: PtgmUpdateFeeRecipient;
    updatePricesDataSources?: wormhole.Emitter[];
    updateWormholeContract?: PtgmUpdateContract;
    updateOracleContract?: PtgmUpdateContract;
    updateStoreContract?: PtgmUpdateContract;
    updateDecoderContract?: PtgmUpdateContract;
    updateGovernanceDataSource?: wormhole.Emitter;
  }

  export interface PnauHeader {
    magicBytes: Uint8Array;
    versionMaj: number;
    versionMin: number;
    trailingSize: number;
    proofType: number;
  }

  export interface PnauHeaderBuildOptions {
    magicBytes?: Uint8Array;
    versionMaj?: number;
    versionMin?: number;
    trailingSize?: number;
    proofType?: number;
  }

  export interface PnauBody {
    vaa: Uint8Array;
    pricesUpdates: PriceUpdateBatch;
    pricesUpdatesToSubmit: Uint8Array[];
  }

  export interface PriceUpdateBatch {
    decoded: PriceUpdate[];
    serialized: Uint8Array[];
    hashed: Uint8Array[];
    proofs: Uint8Array[][];
  }

  export function serializePriceUpdateToClarityValue(
    priceUpdate: PriceUpdate,
  ): ClarityValue {
    return Cl.tuple({
      "price-identifier": Cl.buffer(priceUpdate.priceIdentifier),
      conf: Cl.uint(priceUpdate.conf),
      "ema-conf": Cl.uint(priceUpdate.emaConf),
      "ema-price": Cl.int(priceUpdate.emaPrice),
      expo: Cl.int(priceUpdate.expo),
      "prev-publish-time": Cl.uint(priceUpdate.prevPublishTime),
      price: Cl.int(priceUpdate.price),
      "publish-time": Cl.uint(priceUpdate.publishTime),
    });
  }

  export function preserializePriceUpdateToBuffer(
    priceUpdate: PriceUpdate,
  ): Uint8Array {
    const components = [];
    // Update type
    var v = Buffer.alloc(1);
    v.writeUint8(0, 0);
    components.push(v);
    components.push(priceUpdate.priceIdentifier);
    components.push(bigintToBuffer(priceUpdate.price, 8));
    components.push(bigintToBuffer(priceUpdate.conf, 8));
    v = Buffer.alloc(4);
    v.writeInt32BE(priceUpdate.expo, 0);
    components.push(v);
    components.push(bigintToBuffer(priceUpdate.publishTime, 8));
    components.push(bigintToBuffer(priceUpdate.prevPublishTime, 8));
    components.push(bigintToBuffer(priceUpdate.emaPrice, 8));
    components.push(bigintToBuffer(priceUpdate.emaConf, 8));
    return Buffer.concat(components);
  }

  export function serializePriceUpdateToBuffer(
    priceUpdateData: Uint8Array,
    proof: Uint8Array[],
  ): Uint8Array {
    const components = [];
    // Size
    let messageSize = priceUpdateData.length;
    var v = Buffer.alloc(2);
    v.writeUint16BE(messageSize, 0);
    components.push(v);
    // Price update data
    components.push(priceUpdateData);
    // Proof size
    var v = Buffer.alloc(1);
    v.writeUint8(proof.length, 0);
    components.push(v);
    // Proof
    components.push(...proof);
    return Buffer.concat(components);
  }

  export function buildPtgmVaaPayload(
    opts?: PtgmVaaPayloadBuildOptions,
  ): PtgmVaaPayload {
    let action = 0x00;
    if (opts?.updateFeeValue) {
      action = 0x03;
    } else if (opts?.updateFeeRecipient) {
      action = 0xa0;
    } else if (opts?.updateOracleContract) {
      action = 0x00;
    } else if (opts?.updateWormholeContract) {
      action = 0x06;
    } else if (opts?.updateDecoderContract) {
      action = 0xa2;
    } else if (opts?.updateStoreContract) {
      action = 0xa1;
    } else if (opts?.updatePricesDataSources) {
      action = 0x02;
    } else if (opts?.updateGovernanceDataSource) {
      action = 0x01;
    } else {
      throw "PTGM action unsupported";
    }
    return {
      magicBytes: opts?.magicBytes || PgtmMagicBytes,
      action,
      targetChainId: opts?.targetChainId || 0,
      module: opts?.module || 0,
      updateFeeRecipient: opts?.updateFeeRecipient,
      updateFeeValue: opts?.updateFeeValue,
      updateOracleContract: opts?.updateOracleContract,
      updateWormholeContract: opts?.updateWormholeContract,
      updatePricesDataSources: opts?.updatePricesDataSources,
      updateDecoderContract: opts?.updateDecoderContract,
      updateGovernanceDataSource: opts?.updateGovernanceDataSource,
      updateStoreContract: opts?.updateStoreContract,
    };
  }

  export function serializePtgmVaaPayloadToBuffer(
    payload: PtgmVaaPayload,
  ): Uint8Array {
    const components = [];
    // Magic bytes
    components.push(payload.magicBytes);
    // Module type
    let v = Buffer.alloc(1);
    v.writeUint8(payload.module, 0);
    components.push(v);
    // Action type
    v = Buffer.alloc(1);
    v.writeUint8(payload.action, 0);
    components.push(v);
    // Chain id
    v = Buffer.alloc(1);
    v.writeUint8(payload.targetChainId, 0);
    components.push(v);

    if (payload.updateFeeValue) {
      components.push(bigintToBuffer(payload.updateFeeValue.mantissa, 8));
      components.push(bigintToBuffer(payload.updateFeeValue.exponent, 8));
    } else if (payload.updateFeeRecipient) {
      if (payload.updateFeeRecipient.contractName) {
        let principal = contractPrincipalCV(
          payload.updateFeeRecipient.address,
          payload.updateFeeRecipient.contractName,
        );
        components.push(clarityValueToBuffer(principal));
      } else {
        let principal = principalCV(payload.updateFeeRecipient.address);
        components.push(clarityValueToBuffer(principal));
      }
    } else if (payload.updateOracleContract) {
      let principal = contractPrincipalCV(
        payload.updateOracleContract.address,
        payload.updateOracleContract.contractName,
      );
      components.push(clarityValueToBuffer(principal));
    } else if (payload.updateWormholeContract) {
      let principal = contractPrincipalCV(
        payload.updateWormholeContract.address,
        payload.updateWormholeContract.contractName,
      );
      components.push(clarityValueToBuffer(principal));
    } else if (payload.updateStoreContract) {
      let principal = contractPrincipalCV(
        payload.updateStoreContract.address,
        payload.updateStoreContract.contractName,
      );
      components.push(clarityValueToBuffer(principal));
    } else if (payload.updateDecoderContract) {
      let principal = contractPrincipalCV(
        payload.updateDecoderContract.address,
        payload.updateDecoderContract.contractName,
      );
      components.push(clarityValueToBuffer(principal));
    } else if (payload.updateGovernanceDataSource) {
      // Chain id
      v = Buffer.alloc(2);
      v.writeUint16BE(payload.updateGovernanceDataSource.chain, 0);
      components.push(v);
      // Address
      components.push(payload.updateGovernanceDataSource.address);
    } else if (payload.updatePricesDataSources) {
      // Nuber of updates
      v = Buffer.alloc(1);
      v.writeUint8(payload.updatePricesDataSources.length, 0);
      components.push(v);

      for (let dataSource of payload.updatePricesDataSources) {
        // Chain
        v = Buffer.alloc(2);
        v.writeUint16BE(dataSource.chain, 0);
        components.push(v);
        // Address
        components.push(dataSource.address);
      }
    } else {
      throw "PTGM action unsupported";
    }
    return Buffer.concat(components);
  }

  export function clarityValueToBuffer(value: ClarityValue): Uint8Array {
    // remove 0x prefix
    return Buffer.from(cvToHex(value).slice(2), "hex");
  }

  export function serializeAuwvVaaPayloadToBuffer(
    payload: AuwvVaaPayload,
  ): Uint8Array {
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
    return Buffer.concat(components);
  }

  export function buildPriceUpdateBatch(
    pricesUpdatesSpecs: [
      priceIdentifier: Uint8Array,
      opts?: PriceUpdateBuildOptions,
    ][],
  ): PriceUpdateBatch {
    let decoded = [];
    let serialized = [];
    let hashed = [];
    for (let [priceIdentifier, opts] of pricesUpdatesSpecs) {
      let p = buildPriceUpdate(priceIdentifier, opts);
      let s = preserializePriceUpdateToBuffer(p);
      decoded.push(p);
      serialized.push(s);
      hashed.push(keccak160HashLeaf(s));
    }
    let proofs = [];
    for (let hash of hashed) {
      proofs.push(computeMerkleProof(hash, hashed));
    }
    return {
      decoded,
      serialized,
      hashed,
      proofs,
    };
  }

  export function buildAuwvVaaPayload(
    batch: PriceUpdateBatch,
    auwvBuildOptions?: AuwvVaaPayloadBuildOptions,
  ) {
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
      payloadType: auwvBuildOptions?.payloadType || AuwvMagicBytes,
      updateType: auwvBuildOptions?.updateType || 0,
      merkleRootRingSize: auwvBuildOptions?.merkleRootRingSize || 0,
      merkleRootSlot: auwvBuildOptions?.merkleRootSlot || 0n,
      merkleRootHash: merkleLeaves[0],
    };
  }

  export function buildPnauHeader(opts?: PnauHeaderBuildOptions) {
    return {
      magicBytes: opts?.magicBytes || PnauMagicBytes,
      versionMaj: opts?.versionMaj || 1,
      versionMin: opts?.versionMin || 0,
      trailingSize: opts?.trailingSize || 0,
      proofType: opts?.proofType || 0,
    };
  }

  export function serializePnauToBuffer(
    pnauHeader: PnauHeader,
    pnauBody: PnauBody,
  ) {
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
    // Number of prices updates
    v = Buffer.alloc(1);
    v.writeUint8(pnauBody.pricesUpdatesToSubmit.length, 0);
    components.push(v);
    // Loop on prices updates
    for (let i = 0; i < pnauBody.pricesUpdates.serialized.length; i++) {
      if (
        pnauBody.pricesUpdatesToSubmit.includes(
          pnauBody.pricesUpdates.decoded[i].priceIdentifier,
        )
      ) {
        let priceUpdateData = pnauBody.pricesUpdates.serialized[i];
        components.push(
          serializePriceUpdateToBuffer(
            priceUpdateData,
            pnauBody.pricesUpdates.proofs[i],
          ),
        );
      }
    }
    return Buffer.concat(components);
  }

  function keccak160HashNodes(
    node1: Uint8Array,
    node2: Uint8Array,
  ): Uint8Array {
    let prefix = new Uint8Array([1]);
    if (bufferToBigint(node2) < bufferToBigint(node1)) {
      return keccak_256(Buffer.concat([prefix, node2, node1])).slice(0, 20);
    } else {
      return keccak_256(Buffer.concat([prefix, node1, node2])).slice(0, 20);
    }
  }

  function keccak160HashLeaf(leaf: Uint8Array): Uint8Array {
    let prefix = new Uint8Array([0]);
    return keccak_256(Buffer.concat([prefix, leaf])).slice(0, 20);
  }

  function computeMerkleProof(
    targetLeaf: Uint8Array,
    batch: Uint8Array[],
  ): Uint8Array[] {
    let merkleLeaves = [...batch];
    const proof = [];
    let targetHash = targetLeaf;

    while (merkleLeaves.length > 1) {
      let newLeaves: Uint8Array[] = [];
      for (let i = 0; i < merkleLeaves.length; i += 2) {
        const leftLeaf = merkleLeaves[i];
        const rightLeaf = merkleLeaves[i + 1] || leftLeaf; // Duplicate the last one if odd number of leaves
        const parentNode = keccak160HashNodes(leftLeaf, rightLeaf);
        newLeaves.push(parentNode);

        // Capture the sibling for the proof if either leftLeaf or rightLeaf is the target
        if (leftLeaf === targetHash) {
          proof.push(rightLeaf);
          targetHash = parentNode;
        } else if (rightLeaf === targetHash) {
          proof.push(leftLeaf);
          targetHash = parentNode;
        }
      }
      merkleLeaves = newLeaves;
    }
    return proof;
  }

  export function buildPriceUpdate(
    priceIdentifier: Uint8Array,
    opts?: PriceUpdateBuildOptions,
  ): PriceUpdate {
    return {
      priceIdentifier: priceIdentifier,
      price: opts?.price || 100n,
      conf: opts?.conf || 10n,
      emaPrice: opts?.emaPrice || 95n,
      emaConf: opts?.emaConf || 9n,
      expo: -4,
      publishTime: opts?.publishTime || 10000001n,
      prevPublishTime: opts?.prevPublishTime || 10000000n,
    };
  }

  export function applyGovernanceDataSourceUpdate(
    updateGovernanceDataSource: wormhole.Emitter,
    emitter: wormhole.Emitter,
    guardianSet: wormhole.Guardian[],
    txSenderAddress: string,
    pythGovernanceContractName: string,
    wormholeCoreContractName: string,
    sequence: bigint,
  ) {
    let ptgmVaaPayload = pyth.buildPtgmVaaPayload({
      updateGovernanceDataSource,
    });
    let payload = pyth.serializePtgmVaaPayloadToBuffer(ptgmVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({ payload, sequence, emitter });
    let header = wormhole.buildValidVaaHeader(guardianSet, body, {
      version: 1,
      guardianSetId: 1,
    });

    let vaa = wormhole.serializeVaaToBuffer(header, body);
    let wormholeContract = Cl.contractPrincipal(
      simnet.deployer,
      wormholeCoreContractName,
    );

    let res = simnet.callPublicFn(
      pythGovernanceContractName,
      `update-governance-data-source`,
      [Cl.buffer(vaa), wormholeContract],
      txSenderAddress,
    );

    return res;
  }

  export function applyPricesDataSourceUpdate(
    updatePricesDataSources: wormhole.Emitter[],
    emitter: wormhole.Emitter,
    guardianSet: wormhole.Guardian[],
    txSenderAddress: string,
    pythGovernanceContractName: string,
    wormholeCoreContractName: string,
    sequence: bigint,
  ) {
    let ptgmVaaPayload = pyth.buildPtgmVaaPayload({ updatePricesDataSources });
    let payload = pyth.serializePtgmVaaPayloadToBuffer(ptgmVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({ payload, sequence, emitter });
    let header = wormhole.buildValidVaaHeader(guardianSet, body, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(header, body);
    let wormholeContract = Cl.contractPrincipal(
      simnet.deployer,
      wormholeCoreContractName,
    );
    let res = simnet.callPublicFn(
      pythGovernanceContractName,
      `update-prices-data-sources`,
      [Cl.buffer(vaa), wormholeContract],
      txSenderAddress,
    );

    return res;
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
      let publishTime = prevPublishTime.chain((t: bigint) =>
        fc.constant(t + 10n),
      );
      if (opts && opts.publishTime) {
        publishTime = fc.constant(opts.publishTime);
      }

      return fc.tuple(
        price,
        conf,
        emaPrice,
        emaConf,
        expo,
        prevPublishTime,
        publishTime,
      );
    };
  }
}

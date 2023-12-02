import { Cl, ClarityType } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";
import { wormhole } from "../wormhole/helpers";
import { pyth } from "./helpers";

const pythOracleContractName = "pyth-oracle-v1";
const pythDecoderPnauContractName = "pyth-pnau-decoder-v1";
const pythGovernanceContractName = "pyth-governance-v1";
const pythStorageContractName = "pyth-store-v1";
const wormholeCoreContractName = "wormhole-core-v1";

describe("pyth-pnau-decoder-v1::decode-and-verify-price-feeds success", () => {
  const accounts = simnet.getAccounts();
  const sender = accounts.get("wallet_1")!;
  const guardianSet = wormhole.generateGuardianSetKeychain(19);
  let pricesUpdates = pyth.buildPriceUpdateBatch([
    [pyth.BtcPriceIdentifier],
    [pyth.StxPriceIdentifier],
    [pyth.BatPriceIdentifier],
    [pyth.DaiPriceIdentifier],
    [pyth.TbtcPriceIdentifier],
    [pyth.UsdcPriceIdentifier],
    [pyth.UsdtPriceIdentifier],
    [pyth.WbtcPriceIdentifier],
  ]);
  let pricesUpdatesToSubmit = [
    pyth.BtcPriceIdentifier,
    pyth.StxPriceIdentifier,
    pyth.UsdcPriceIdentifier,
  ];
  let pricesUpdatesVaaPayload = pyth.buildAuwvVaaPayload(pricesUpdates);

  // Before starting the test suite, we have to setup the guardian set.
  beforeEach(async () => {
    wormhole.applyGuardianSetUpdate(
      guardianSet,
      1,
      sender,
      wormholeCoreContractName,
    );

    pyth.applyGovernanceDataSourceUpdate(
      pyth.DefaultGovernanceDataSource,
      pyth.InitialGovernanceDataSource,
      guardianSet,
      sender,
      pythGovernanceContractName,
      wormholeCoreContractName,
      2n,
    );

    pyth.applyPricesDataSourceUpdate(
      pyth.DefaultPricesDataSources,
      pyth.DefaultGovernanceDataSource,
      guardianSet,
      sender,
      pythGovernanceContractName,
      wormholeCoreContractName,
      3n,
    );
  });

  it("should parse and verify the Vaa a Pnau message", () => {
    let payload = pyth.serializeAuwvVaaPayloadToBuffer(pricesUpdatesVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultPricesDataSources[0],
    });
    let header = wormhole.buildValidVaaHeader(guardianSet, body, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(header, body);

    let [decodedVaa, _] = wormhole.serializeVaaToClarityValue(
      header,
      body,
      guardianSet,
    );
    const res = simnet.callReadOnlyFn(
      wormholeCoreContractName,
      `parse-and-verify-vaa`,
      [Cl.buffer(vaa)],
      sender,
    );
    expect(res.result).toBeOk(decodedVaa);
  });

  it("should produce a correct verifiable empty vaa", () => {
    let payload = pyth.serializeAuwvVaaPayloadToBuffer(pricesUpdatesVaaPayload);
    let vaaBody = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultPricesDataSources[0],
    });

    let vaaHeader = wormhole.buildValidVaaHeader(guardianSet, vaaBody, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(vaaHeader, vaaBody);
    let pnauHeader = pyth.buildPnauHeader();
    let pnau = pyth.serializePnauToBuffer(pnauHeader, {
      vaa,
      pricesUpdates,
      pricesUpdatesToSubmit,
    });

    let executionPlan = Cl.tuple({
      "pyth-storage-contract": Cl.contractPrincipal(
        simnet.deployer,
        pythStorageContractName,
      ),
      "pyth-decoder-contract": Cl.contractPrincipal(
        simnet.deployer,
        pythDecoderPnauContractName,
      ),
      "wormhole-core-contract": Cl.contractPrincipal(
        simnet.deployer,
        wormholeCoreContractName,
      ),
    });
    const res = simnet.callPublicFn(
      pythOracleContractName,
      "verify-and-update-price-feeds",
      [Cl.buffer(pnau), executionPlan],
      sender,
    );

    expect(res.result).toHaveClarityType(ClarityType.ResponseOk);
  });
});

describe("pyth-pnau-decoder-v1::decode-and-verify-price-feeds failures", () => {
  const accounts = simnet.getAccounts();
  const sender = accounts.get("wallet_1")!;
  const guardianSet = wormhole.generateGuardianSetKeychain(19);
  let pricesUpdates = pyth.buildPriceUpdateBatch([
    [pyth.BtcPriceIdentifier],
    [pyth.StxPriceIdentifier],
    [pyth.BatPriceIdentifier],
    [pyth.DaiPriceIdentifier],
    [pyth.TbtcPriceIdentifier],
    [pyth.UsdcPriceIdentifier],
    [pyth.UsdtPriceIdentifier],
    [pyth.WbtcPriceIdentifier],
  ]);
  let pricesUpdatesToSubmit = [
    pyth.BtcPriceIdentifier,
    pyth.StxPriceIdentifier,
    pyth.UsdcPriceIdentifier,
  ];
  let pricesUpdatesVaaPayload = pyth.buildAuwvVaaPayload(pricesUpdates);
  let executionPlan = Cl.tuple({
    "pyth-storage-contract": Cl.contractPrincipal(
      simnet.deployer,
      pythStorageContractName,
    ),
    "pyth-decoder-contract": Cl.contractPrincipal(
      simnet.deployer,
      pythDecoderPnauContractName,
    ),
    "wormhole-core-contract": Cl.contractPrincipal(
      simnet.deployer,
      wormholeCoreContractName,
    ),
  });

  // Before starting the test suite, we have to setup the guardian set and propagate one update
  beforeEach(async () => {
    wormhole.applyGuardianSetUpdate(
      guardianSet,
      1,
      sender,
      wormholeCoreContractName,
    );

    pyth.applyGovernanceDataSourceUpdate(
      pyth.DefaultGovernanceDataSource,
      pyth.InitialGovernanceDataSource,
      guardianSet,
      sender,
      pythGovernanceContractName,
      wormholeCoreContractName,
      2n,
    );

    pyth.applyPricesDataSourceUpdate(
      pyth.DefaultPricesDataSources,
      pyth.DefaultGovernanceDataSource,
      guardianSet,
      sender,
      pythGovernanceContractName,
      wormholeCoreContractName,
      3n,
    );

    pyth.applyStalePriceThresholdUpdate(
      { threshold: 10800n },
      pyth.DefaultGovernanceDataSource,
      guardianSet,
      sender,
      pythGovernanceContractName,
      wormholeCoreContractName,
      4n,
    );

    let payload = pyth.serializeAuwvVaaPayloadToBuffer(pricesUpdatesVaaPayload);
    let vaaBody = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultPricesDataSources[0],
    });
    let vaaHeader = wormhole.buildValidVaaHeader(guardianSet, vaaBody, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(vaaHeader, vaaBody);
    let pnauHeader = pyth.buildPnauHeader();
    let pnau = pyth.serializePnauToBuffer(pnauHeader, {
      vaa,
      pricesUpdates,
      pricesUpdatesToSubmit,
    });

    let res = simnet.callPublicFn(
      pythOracleContractName,
      "verify-and-update-price-feeds",
      [Cl.buffer(pnau), executionPlan],
      sender,
    );

    expect(res.result).toBeOk(
      Cl.list([
        Cl.tuple({
          "price-identifier": Cl.buffer(pyth.BtcPriceIdentifier),
          price: Cl.int(pricesUpdates.decoded[0].price),
          conf: Cl.uint(pricesUpdates.decoded[0].conf),
          "ema-conf": Cl.uint(pricesUpdates.decoded[0].emaConf),
          "ema-price": Cl.int(pricesUpdates.decoded[0].emaPrice),
          expo: Cl.int(pricesUpdates.decoded[0].expo),
          "prev-publish-time": Cl.uint(
            pricesUpdates.decoded[0].prevPublishTime,
          ),
          "publish-time": Cl.uint(pricesUpdates.decoded[0].publishTime),
        }),
        Cl.tuple({
          "price-identifier": Cl.buffer(pyth.StxPriceIdentifier),
          price: Cl.int(pricesUpdates.decoded[1].price),
          conf: Cl.uint(pricesUpdates.decoded[1].conf),
          "ema-conf": Cl.uint(pricesUpdates.decoded[1].emaConf),
          "ema-price": Cl.int(pricesUpdates.decoded[1].emaPrice),
          expo: Cl.int(pricesUpdates.decoded[1].expo),
          "prev-publish-time": Cl.uint(
            pricesUpdates.decoded[1].prevPublishTime,
          ),
          "publish-time": Cl.uint(pricesUpdates.decoded[1].publishTime),
        }),
        Cl.tuple({
          "price-identifier": Cl.buffer(pyth.UsdcPriceIdentifier),
          price: Cl.int(pricesUpdates.decoded[2].price),
          conf: Cl.uint(pricesUpdates.decoded[2].conf),
          "ema-conf": Cl.uint(pricesUpdates.decoded[2].emaConf),
          "ema-price": Cl.int(pricesUpdates.decoded[2].emaPrice),
          expo: Cl.int(pricesUpdates.decoded[2].expo),
          "prev-publish-time": Cl.uint(
            pricesUpdates.decoded[2].prevPublishTime,
          ),
          "publish-time": Cl.uint(pricesUpdates.decoded[2].publishTime),
        }),
      ]),
    );
  });

  it("should succeed updating prices once", () => {
    let res = simnet.callPublicFn(
      pythOracleContractName,
      "read-price-feed",
      [
        Cl.buffer(pyth.BtcPriceIdentifier),
        Cl.contractPrincipal(simnet.deployer, pythStorageContractName),
      ],
      sender,
    );
    expect(res.result).toBeOk(
      Cl.tuple({
        price: Cl.int(pricesUpdates.decoded[0].price),
        conf: Cl.uint(pricesUpdates.decoded[0].conf),
        "ema-conf": Cl.uint(pricesUpdates.decoded[0].emaConf),
        "ema-price": Cl.int(pricesUpdates.decoded[0].emaPrice),
        expo: Cl.int(pricesUpdates.decoded[0].expo),
        "prev-publish-time": Cl.uint(pricesUpdates.decoded[0].prevPublishTime),
        "publish-time": Cl.uint(pricesUpdates.decoded[0].publishTime),
      }),
    );
  });

  it("should fail storing outdated subsequent updates", () => {
    let outdatedPricesUpdates = pyth.buildPriceUpdateBatch([
      [pyth.BtcPriceIdentifier, { price: 0n, publishTime: 9999999n }],
      [pyth.StxPriceIdentifier],
      [pyth.BatPriceIdentifier],
      [pyth.DaiPriceIdentifier],
      [pyth.TbtcPriceIdentifier],
      [pyth.UsdcPriceIdentifier],
      [pyth.UsdtPriceIdentifier],
      [pyth.WbtcPriceIdentifier],
    ]);
    let outdatedPricesUpdatesVaaPayload = pyth.buildAuwvVaaPayload(
      outdatedPricesUpdates,
    );
    let payload = pyth.serializeAuwvVaaPayloadToBuffer(
      outdatedPricesUpdatesVaaPayload,
    );
    let vaaBody = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultPricesDataSources[0],
    });
    let vaaHeader = wormhole.buildValidVaaHeader(guardianSet, vaaBody, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(vaaHeader, vaaBody);
    let pnauHeader = pyth.buildPnauHeader();
    let pnau = pyth.serializePnauToBuffer(pnauHeader, {
      vaa,
      pricesUpdates: outdatedPricesUpdates,
      pricesUpdatesToSubmit,
    });

    let res = simnet.callPublicFn(
      pythOracleContractName,
      "verify-and-update-price-feeds",
      [Cl.buffer(pnau), executionPlan],
      sender,
    );

    res = simnet.callPublicFn(
      pythOracleContractName,
      "read-price-feed",
      [
        Cl.buffer(pyth.BtcPriceIdentifier),
        Cl.contractPrincipal(simnet.deployer, pythStorageContractName),
      ],
      sender,
    );
    expect(res.result).toBeOk(
      Cl.tuple({
        price: Cl.int(pricesUpdates.decoded[0].price),
        conf: Cl.uint(pricesUpdates.decoded[0].conf),
        "ema-conf": Cl.uint(pricesUpdates.decoded[0].emaConf),
        "ema-price": Cl.int(pricesUpdates.decoded[0].emaPrice),
        expo: Cl.int(pricesUpdates.decoded[0].expo),
        "prev-publish-time": Cl.uint(pricesUpdates.decoded[0].prevPublishTime),
        "publish-time": Cl.uint(pricesUpdates.decoded[0].publishTime),
      }),
    );
  });

  it("should succeed storing new subsequent updates", () => {
    let actualPricesUpdates = pyth.buildPriceUpdateBatch([
      [pyth.BtcPriceIdentifier],
      [pyth.StxPriceIdentifier],
      [pyth.BatPriceIdentifier],
      [pyth.DaiPriceIdentifier],
      [pyth.TbtcPriceIdentifier],
      [pyth.UsdcPriceIdentifier],
      [pyth.UsdtPriceIdentifier],
      [pyth.WbtcPriceIdentifier],
    ]);
    let actualPricesUpdatesVaaPayload =
      pyth.buildAuwvVaaPayload(actualPricesUpdates);
    let payload = pyth.serializeAuwvVaaPayloadToBuffer(
      actualPricesUpdatesVaaPayload,
    );
    let vaaBody = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultPricesDataSources[0],
    });
    let vaaHeader = wormhole.buildValidVaaHeader(guardianSet, vaaBody, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(vaaHeader, vaaBody);
    let pnauHeader = pyth.buildPnauHeader();
    let pnau = pyth.serializePnauToBuffer(pnauHeader, {
      vaa,
      pricesUpdates: actualPricesUpdates,
      pricesUpdatesToSubmit,
    });

    let res = simnet.callPublicFn(
      pythOracleContractName,
      "verify-and-update-price-feeds",
      [Cl.buffer(pnau), executionPlan],
      sender,
    );

    res = simnet.callPublicFn(
      pythOracleContractName,
      "read-price-feed",
      [
        Cl.buffer(pyth.BtcPriceIdentifier),
        Cl.contractPrincipal(simnet.deployer, pythStorageContractName),
      ],
      sender,
    );
    expect(res.result).toBeOk(
      Cl.tuple({
        price: Cl.int(actualPricesUpdates.decoded[0].price),
        conf: Cl.uint(actualPricesUpdates.decoded[0].conf),
        "ema-conf": Cl.uint(actualPricesUpdates.decoded[0].emaConf),
        "ema-price": Cl.int(actualPricesUpdates.decoded[0].emaPrice),
        expo: Cl.int(actualPricesUpdates.decoded[0].expo),
        "prev-publish-time": Cl.uint(
          actualPricesUpdates.decoded[0].prevPublishTime,
        ),
        "publish-time": Cl.uint(actualPricesUpdates.decoded[0].publishTime),
      }),
    );
  });

  it("should fail if AUWV payloadType is incorrect", () => {
    let actualPricesUpdates = pyth.buildPriceUpdateBatch([
      [pyth.BtcPriceIdentifier, { price: 100n }],
    ]);
    let actualPricesUpdatesVaaPayload = pyth.buildAuwvVaaPayload(
      actualPricesUpdates,
      { payloadType: Buffer.from("41555755", "hex") },
    );
    let payload = pyth.serializeAuwvVaaPayloadToBuffer(
      actualPricesUpdatesVaaPayload,
    );
    let vaaBody = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultPricesDataSources[0],
    });
    let vaaHeader = wormhole.buildValidVaaHeader(guardianSet, vaaBody, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(vaaHeader, vaaBody);
    let pnauHeader = pyth.buildPnauHeader();
    let pnau = pyth.serializePnauToBuffer(pnauHeader, {
      vaa,
      pricesUpdates: actualPricesUpdates,
      pricesUpdatesToSubmit,
    });

    let res = simnet.callPublicFn(
      pythOracleContractName,
      "verify-and-update-price-feeds",
      [Cl.buffer(pnau), executionPlan],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(2001));
  });

  it("should fail if AUWV updateType is incorrect", () => {
    let actualPricesUpdates = pyth.buildPriceUpdateBatch([
      [pyth.BtcPriceIdentifier, { price: 100n }],
    ]);
    let actualPricesUpdatesVaaPayload = pyth.buildAuwvVaaPayload(
      actualPricesUpdates,
      { updateType: 1 },
    );
    let payload = pyth.serializeAuwvVaaPayloadToBuffer(
      actualPricesUpdatesVaaPayload,
    );
    let vaaBody = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultPricesDataSources[0],
    });
    let vaaHeader = wormhole.buildValidVaaHeader(guardianSet, vaaBody, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(vaaHeader, vaaBody);
    let pnauHeader = pyth.buildPnauHeader();
    let pnau = pyth.serializePnauToBuffer(pnauHeader, {
      vaa,
      pricesUpdates: actualPricesUpdates,
      pricesUpdatesToSubmit,
    });

    let res = simnet.callPublicFn(
      pythOracleContractName,
      "verify-and-update-price-feeds",
      [Cl.buffer(pnau), executionPlan],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(2005));
  });

  it("should fail if PNAU magic bytes is incorrect", () => {
    let actualPricesUpdates = pyth.buildPriceUpdateBatch([
      [pyth.BtcPriceIdentifier, { price: 100n }],
    ]);
    let actualPricesUpdatesVaaPayload =
      pyth.buildAuwvVaaPayload(actualPricesUpdates);
    let payload = pyth.serializeAuwvVaaPayloadToBuffer(
      actualPricesUpdatesVaaPayload,
    );
    let vaaBody = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultPricesDataSources[0],
    });
    let vaaHeader = wormhole.buildValidVaaHeader(guardianSet, vaaBody, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(vaaHeader, vaaBody);
    let pnauHeader = pyth.buildPnauHeader({
      magicBytes: Buffer.from("41555755", "hex"),
    });
    let pnau = pyth.serializePnauToBuffer(pnauHeader, {
      vaa,
      pricesUpdates: actualPricesUpdates,
      pricesUpdatesToSubmit,
    });

    let res = simnet.callPublicFn(
      pythOracleContractName,
      "verify-and-update-price-feeds",
      [Cl.buffer(pnau), executionPlan],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(2001));
  });

  it("should fail if PNAU major version is incorrect", () => {
    let actualPricesUpdates = pyth.buildPriceUpdateBatch([
      [pyth.BtcPriceIdentifier, { price: 100n }],
    ]);
    let actualPricesUpdatesVaaPayload =
      pyth.buildAuwvVaaPayload(actualPricesUpdates);
    let payload = pyth.serializeAuwvVaaPayloadToBuffer(
      actualPricesUpdatesVaaPayload,
    );
    let vaaBody = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultPricesDataSources[0],
    });
    let vaaHeader = wormhole.buildValidVaaHeader(guardianSet, vaaBody, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(vaaHeader, vaaBody);
    let pnauHeader = pyth.buildPnauHeader({
      versionMaj: 5,
    });
    let pnau = pyth.serializePnauToBuffer(pnauHeader, {
      vaa,
      pricesUpdates: actualPricesUpdates,
      pricesUpdatesToSubmit,
    });

    let res = simnet.callPublicFn(
      pythOracleContractName,
      "verify-and-update-price-feeds",
      [Cl.buffer(pnau), executionPlan],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(2002));
  });

  it("should fail if PNAU minor version is incorrect", () => {
    let actualPricesUpdates = pyth.buildPriceUpdateBatch([
      [pyth.BtcPriceIdentifier, { price: 100n }],
    ]);
    let actualPricesUpdatesVaaPayload =
      pyth.buildAuwvVaaPayload(actualPricesUpdates);
    let payload = pyth.serializeAuwvVaaPayloadToBuffer(
      actualPricesUpdatesVaaPayload,
    );
    let vaaBody = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultPricesDataSources[0],
    });
    let vaaHeader = wormhole.buildValidVaaHeader(guardianSet, vaaBody, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(vaaHeader, vaaBody);
    let pnauHeader = pyth.buildPnauHeader({
      versionMin: 5,
    });
    let pnau = pyth.serializePnauToBuffer(pnauHeader, {
      vaa,
      pricesUpdates: actualPricesUpdates,
      pricesUpdatesToSubmit,
    });

    let res = simnet.callPublicFn(
      pythOracleContractName,
      "verify-and-update-price-feeds",
      [Cl.buffer(pnau), executionPlan],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(2003));
  });

  it("should fail if PNAU proof type version is incorrect", () => {
    let actualPricesUpdates = pyth.buildPriceUpdateBatch([
      [pyth.BtcPriceIdentifier, { price: 100n }],
    ]);
    let actualPricesUpdatesVaaPayload =
      pyth.buildAuwvVaaPayload(actualPricesUpdates);
    let payload = pyth.serializeAuwvVaaPayloadToBuffer(
      actualPricesUpdatesVaaPayload,
    );
    let vaaBody = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultPricesDataSources[0],
    });
    let vaaHeader = wormhole.buildValidVaaHeader(guardianSet, vaaBody, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(vaaHeader, vaaBody);
    let pnauHeader = pyth.buildPnauHeader({
      proofType: 5,
    });
    let pnau = pyth.serializePnauToBuffer(pnauHeader, {
      vaa,
      pricesUpdates: actualPricesUpdates,
      pricesUpdatesToSubmit,
    });

    let res = simnet.callPublicFn(
      pythOracleContractName,
      "verify-and-update-price-feeds",
      [Cl.buffer(pnau), executionPlan],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(2005));
  });

  it("should fail if PNAU include Merkle root mismatches", () => {
    let actualPricesUpdates = pyth.buildPriceUpdateBatch([
      [pyth.BtcPriceIdentifier, { price: 100n }],
    ]);
    let actualPricesUpdatesVaaPayload =
      pyth.buildAuwvVaaPayload(actualPricesUpdates);
    actualPricesUpdatesVaaPayload.merkleRootHash = new Uint8Array(
      Buffer.alloc(32),
    );
    let payload = pyth.serializeAuwvVaaPayloadToBuffer(
      actualPricesUpdatesVaaPayload,
    );
    let vaaBody = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultPricesDataSources[0],
    });
    let vaaHeader = wormhole.buildValidVaaHeader(guardianSet, vaaBody, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(vaaHeader, vaaBody);
    let pnauHeader = pyth.buildPnauHeader();
    let pnau = pyth.serializePnauToBuffer(pnauHeader, {
      vaa,
      pricesUpdates: actualPricesUpdates,
      pricesUpdatesToSubmit,
    });

    let res = simnet.callPublicFn(
      pythOracleContractName,
      "verify-and-update-price-feeds",
      [Cl.buffer(pnau), executionPlan],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(2008));
  });

  it("should fail if the price is below stale threshold", () => {
    // Everytime a simnet block is being mined, we add 1500s to the initial genesis time - usually bringing us to the future.
    let onChainTime = pyth.timestampNow() + 1500n * BigInt(simnet.blockHeight);
    simnet.mineEmptyBlocks(7); // stale threshold set to 10800 (3 hours), so by mining 7 blocks (1800s), we are advancing enough
    let actualPricesUpdates = pyth.buildPriceUpdateBatch([
      [
        pyth.BtcPriceIdentifier,
        {
          price: 100n,
          publishTime: onChainTime,
        },
      ],
    ]);
    let actualPricesUpdatesVaaPayload =
      pyth.buildAuwvVaaPayload(actualPricesUpdates);
    let payload = pyth.serializeAuwvVaaPayloadToBuffer(
      actualPricesUpdatesVaaPayload,
    );
    let vaaBody = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultPricesDataSources[0],
    });
    let vaaHeader = wormhole.buildValidVaaHeader(guardianSet, vaaBody, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(vaaHeader, vaaBody);
    let pnauHeader = pyth.buildPnauHeader();
    let pnau = pyth.serializePnauToBuffer(pnauHeader, {
      vaa,
      pricesUpdates: actualPricesUpdates,
      pricesUpdatesToSubmit,
    });

    let res = simnet.callPublicFn(
      pythOracleContractName,
      "verify-and-update-price-feeds",
      [Cl.buffer(pnau), executionPlan],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(5003));
  });

  it("should only return validated prices and filter invalid prices", () => {
    // Everytime a simnet block is being mined, we add 1500s to the initial genesis time - usually bringing us to the future.
    let previousOnChainTime =
      pyth.timestampNow() + 1500n * BigInt(simnet.blockHeight);
    simnet.mineEmptyBlocks(7); // stale threshold set to 10800 (3 hours), so by mining 7 blocks (1800s), we are advancing enough
    let newOnChainTime =
      pyth.timestampNow() + 1500n * BigInt(simnet.blockHeight);
    let actualPricesUpdates = pyth.buildPriceUpdateBatch([
      [
        pyth.BtcPriceIdentifier,
        {
          price: 100n,
          publishTime: previousOnChainTime,
        },
      ],
      [pyth.StxPriceIdentifier, { price: 100n, publishTime: newOnChainTime }],
      [pyth.UsdcPriceIdentifier, { price: 100n, publishTime: newOnChainTime }],
    ]);

    let actualPricesUpdatesVaaPayload =
      pyth.buildAuwvVaaPayload(actualPricesUpdates);
    let payload = pyth.serializeAuwvVaaPayloadToBuffer(
      actualPricesUpdatesVaaPayload,
    );
    let vaaBody = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultPricesDataSources[0],
    });
    let vaaHeader = wormhole.buildValidVaaHeader(guardianSet, vaaBody, {
      version: 1,
      guardianSetId: 1,
    });
    let vaa = wormhole.serializeVaaToBuffer(vaaHeader, vaaBody);
    let pnauHeader = pyth.buildPnauHeader();
    let pnau = pyth.serializePnauToBuffer(pnauHeader, {
      vaa,
      pricesUpdates: actualPricesUpdates,
      pricesUpdatesToSubmit,
    });

    let res = simnet.callPublicFn(
      pythOracleContractName,
      "verify-and-update-price-feeds",
      [Cl.buffer(pnau), executionPlan],
      sender,
    );
    expect(res.result).toBeOk(
      Cl.list([
        Cl.tuple({
          "price-identifier": Cl.buffer(pyth.StxPriceIdentifier),
          price: Cl.int(actualPricesUpdates.decoded[1].price),
          conf: Cl.uint(actualPricesUpdates.decoded[1].conf),
          "ema-conf": Cl.uint(actualPricesUpdates.decoded[1].emaConf),
          "ema-price": Cl.int(actualPricesUpdates.decoded[1].emaPrice),
          expo: Cl.int(actualPricesUpdates.decoded[1].expo),
          "prev-publish-time": Cl.uint(
            actualPricesUpdates.decoded[1].prevPublishTime,
          ),
          "publish-time": Cl.uint(actualPricesUpdates.decoded[1].publishTime),
        }),
        Cl.tuple({
          "price-identifier": Cl.buffer(pyth.UsdcPriceIdentifier),
          price: Cl.int(actualPricesUpdates.decoded[2].price),
          conf: Cl.uint(actualPricesUpdates.decoded[2].conf),
          "ema-conf": Cl.uint(actualPricesUpdates.decoded[2].emaConf),
          "ema-price": Cl.int(actualPricesUpdates.decoded[2].emaPrice),
          expo: Cl.int(actualPricesUpdates.decoded[2].expo),
          "prev-publish-time": Cl.uint(
            actualPricesUpdates.decoded[2].prevPublishTime,
          ),
          "publish-time": Cl.uint(actualPricesUpdates.decoded[2].publishTime),
        }),
      ]),
    );
  });
});

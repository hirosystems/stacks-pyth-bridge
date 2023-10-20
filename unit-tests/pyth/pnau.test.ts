import { Cl, ClarityType } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";
import { wormhole } from "../wormhole/helpers";
import { pyth } from "./helpers";

const pythOracleContractName = "pyth-oracle-v1";
const pythDecoderPnauContractName = "pyth-pnau-decoder-v1";
const pythStorageContractName = "pyth-store-v1";
const wormholeCoreContractName = "wormhole-core-v1";

describe("pyth-pnau-decoder-v1::decode-and-verify-price-feeds success", () => {
  const accounts = simnet.getAccounts();
  const sender = accounts.get("wallet_1")!;
  const guardianSet = wormhole.generateGuardianSetKeychain(19);
  let pricesUpdates = pyth.buildPriceUpdateBatch([
    [pyth.BtcPriceIdentifier],
    [pyth.StxPriceIdentifier],
    [pyth.BatPriceIdentifer],
    [pyth.DaiPriceIdentifer],
    [pyth.TbtcPriceIdentifer],
    [pyth.UsdcPriceIdentifer],
    [pyth.UsdtPriceIdentifer],
    [pyth.WbtcPriceIdentifer],
  ]);
  let pricesUpdatesToSubmit = [
    pyth.BtcPriceIdentifier,
    pyth.StxPriceIdentifier,
    pyth.UsdcPriceIdentifer,
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
  });

  it("should parse and verify the Vaa a a Pnau message", () => {
    let payload = pyth.serializeAuwvVaaPayloadToBuffer(pricesUpdatesVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({ payload });
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
    let vaaBody = wormhole.buildValidVaaBodySpecs({ payload });
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

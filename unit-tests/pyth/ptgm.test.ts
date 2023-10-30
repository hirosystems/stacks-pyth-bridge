import { Cl } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";
import { wormhole } from "../wormhole/helpers";
import { pyth } from "./helpers";

const pythOracleContractName = "pyth-oracle-v1";
const pythStorageContractName = "pyth-store-v1";
const pythDecoderPnauContractName = "pyth-pnau-decoder-v1";
const pythGovernanceContractName = "pyth-governance-v1";
const wormholeCoreContractName = "wormhole-core-v1";

describe("pyth-governance-v1::update-fee-value", () => {
  const accounts = simnet.getAccounts();
  const sender = accounts.get("wallet_1")!;
  const initialDeployer = accounts.get("deployer")!;
  const guardianSet = wormhole.generateGuardianSetKeychain(19);
  let updateFeeValue = {
    mantissa: 2n,
    exponent: 1n,
  };
  let ptgmVaaPayload = pyth.buildPtgmVaaPayload({ updateFeeValue });

  // Before starting the test suite, we have to setup the guardian set.
  beforeEach(async () => {
    wormhole.applyGuardianSetUpdate(
      guardianSet,
      1,
      sender,
      wormholeCoreContractName,
    );
  });

  it("should update fee-info on successful updates", () => {
    let payload = pyth.serializePtgmVaaPayloadToBuffer(ptgmVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({ payload });
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
      `update-fee-value`,
      [Cl.buffer(vaa), wormholeContract],
      sender,
    );
    expect(res.result).toBeOk(
      Cl.tuple({
        exponent: Cl.uint(updateFeeValue.exponent),
        mantissa: Cl.uint(updateFeeValue.mantissa),
      }),
    );

    res = simnet.callReadOnlyFn(
      pythGovernanceContractName,
      `get-fee-info`,
      [],
      sender,
    );

    expect(Cl.ok(res.result)).toBeOk(
      Cl.tuple({
        address: Cl.standardPrincipal(initialDeployer),
        exponent: Cl.uint(updateFeeValue.exponent),
        mantissa: Cl.uint(updateFeeValue.mantissa),
      }),
    );
  });
});

describe("pyth-governance-v1::update-fee-recipient", () => {
  const accounts = simnet.getAccounts();
  const sender = accounts.get("wallet_1")!;
  const guardianSet = wormhole.generateGuardianSetKeychain(19);
  let updateFeeRecipient = {
    address: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
  };
  let ptgmVaaPayload = pyth.buildPtgmVaaPayload({ updateFeeRecipient });

  // Before starting the test suite, we have to setup the guardian set.
  beforeEach(async () => {
    wormhole.applyGuardianSetUpdate(
      guardianSet,
      1,
      sender,
      wormholeCoreContractName,
    );
  });

  it("should update fee recipient address on successful updates", () => {
    let payload = pyth.serializePtgmVaaPayloadToBuffer(ptgmVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({ payload });
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
      `update-fee-recipient-address`,
      [Cl.buffer(vaa), wormholeContract],
      sender,
    );
    expect(res.result).toBeOk(Cl.standardPrincipal(updateFeeRecipient.address));

    res = simnet.callReadOnlyFn(
      pythGovernanceContractName,
      `get-fee-info`,
      [],
      sender,
    );
    expect(Cl.ok(res.result)).toBeOk(
      Cl.tuple({
        address: Cl.standardPrincipal(updateFeeRecipient.address),
        exponent: Cl.uint(1),
        mantissa: Cl.uint(1),
      }),
    );
  });
});

describe("pyth-governance-v1::update-wormhole-core-contract", () => {
  const accounts = simnet.getAccounts();
  const sender = accounts.get("wallet_1")!;
  const deployer = accounts.get("deployer")!;
  const guardianSet = wormhole.generateGuardianSetKeychain(19);
  let updateWormholeContract = {
    address: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
    contractName: "wormhole-core-v2",
  };
  let ptgmVaaPayload = pyth.buildPtgmVaaPayload({ updateWormholeContract });

  // Before starting the test suite, we have to setup the guardian set.
  beforeEach(async () => {
    wormhole.applyGuardianSetUpdate(
      guardianSet,
      1,
      sender,
      wormholeCoreContractName,
    );
  });

  it("should update the execution plan on successful updates", () => {
    let payload = pyth.serializePtgmVaaPayloadToBuffer(ptgmVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({ payload });
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
      `update-wormhole-core-contract`,
      [Cl.buffer(vaa), wormholeContract],
      sender,
    );
    let executionPlan = Cl.tuple({
      "pyth-oracle-contract": Cl.contractPrincipal(
        deployer,
        pythOracleContractName,
      ),
      "pyth-decoder-contract": Cl.contractPrincipal(
        deployer,
        pythDecoderPnauContractName,
      ),
      "pyth-storage-contract": Cl.contractPrincipal(
        deployer,
        pythStorageContractName,
      ),
      "wormhole-core-contract": Cl.contractPrincipal(
        updateWormholeContract.address,
        updateWormholeContract.contractName,
      ),
    });
    expect(res.result).toBeOk(executionPlan);

    res = simnet.callReadOnlyFn(
      pythGovernanceContractName,
      `get-current-execution-plan`,
      [],
      sender,
    );
    expect(Cl.ok(res.result)).toBeOk(executionPlan);
  });
});

describe("pyth-governance-v1::update-pyth-oracle-contract", () => {
  const accounts = simnet.getAccounts();
  const sender = accounts.get("wallet_1")!;
  const deployer = accounts.get("deployer")!;
  const guardianSet = wormhole.generateGuardianSetKeychain(19);
  let updateOracleContract = {
    address: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
    contractName: "pyth-oracle-v2",
  };
  let ptgmVaaPayload = pyth.buildPtgmVaaPayload({ updateOracleContract });

  // Before starting the test suite, we have to setup the guardian set.
  beforeEach(async () => {
    wormhole.applyGuardianSetUpdate(
      guardianSet,
      1,
      sender,
      wormholeCoreContractName,
    );
  });

  it("should update the execution plan on successful updates", () => {
    let payload = pyth.serializePtgmVaaPayloadToBuffer(ptgmVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({ payload });
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
      `update-pyth-oracle-contract`,
      [Cl.buffer(vaa), wormholeContract],
      sender,
    );
    let executionPlan = Cl.tuple({
      "pyth-oracle-contract": Cl.contractPrincipal(
        updateOracleContract.address,
        updateOracleContract.contractName,
      ),
      "pyth-decoder-contract": Cl.contractPrincipal(
        deployer,
        pythDecoderPnauContractName,
      ),
      "pyth-storage-contract": Cl.contractPrincipal(
        deployer,
        pythStorageContractName,
      ),
      "wormhole-core-contract": Cl.contractPrincipal(
        deployer,
        wormholeCoreContractName,
      ),
    });
    expect(res.result).toBeOk(executionPlan);

    res = simnet.callReadOnlyFn(
      pythGovernanceContractName,
      `get-current-execution-plan`,
      [],
      sender,
    );
    expect(Cl.ok(res.result)).toBeOk(executionPlan);
  });
});

describe("pyth-governance-v1::update-prices-data-sources", () => {
  const accounts = simnet.getAccounts();
  const sender = accounts.get("wallet_1")!;
  const guardianSet = wormhole.generateGuardianSetKeychain(19);
  let updatePricesDataSources = [
    {
      chain: 5,
      address: Buffer.alloc(32),
    },
    {
      chain: 6,
      address: Buffer.alloc(32),
    },
    {
      chain: 7,
      address: Buffer.alloc(32),
    },
  ];
  let ptgmVaaPayload = pyth.buildPtgmVaaPayload({ updatePricesDataSources });

  // Before starting the test suite, we have to setup the guardian set.
  beforeEach(async () => {
    wormhole.applyGuardianSetUpdate(
      guardianSet,
      1,
      sender,
      wormholeCoreContractName,
    );
  });

  it("should update prices data sources on successful updates", () => {
    let payload = pyth.serializePtgmVaaPayloadToBuffer(ptgmVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.InitialGovernanceDataSource,
    });
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
      sender,
    );
    expect(res.result).toBeOk(
      Cl.list(
        updatePricesDataSources.map((d) =>
          Cl.tuple({
            "emitter-address": Cl.buffer(d.address),
            "emitter-chain": Cl.uint(d.chain),
          }),
        ),
      ),
    );
  });
});

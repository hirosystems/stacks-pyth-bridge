import { Cl } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";
import { wormhole } from "../wormhole/helpers";
import { pyth } from "./helpers";
import { hexToBytes } from "@noble/hashes/utils";

const pythOracleContractName = "pyth-oracle-v1";
const pythStorageContractName = "pyth-store-v1";
const pythDecoderPnauContractName = "pyth-pnau-decoder-v1";
const pythGovernanceContractName = "pyth-governance-v1";
const wormholeCoreContractName = "wormhole-core-v1";

describe("pyth-governance-v1::update-fee-value", () => {
  const accounts = simnet.getAccounts();
  const sender = accounts.get("wallet_1")!;
  const initialFeeRecipient = "ST3CRXBDXQ2N5P7E25Q39MEX1HSMRDSEAP1JST19D";
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
        address: Cl.standardPrincipal(initialFeeRecipient),
        exponent: Cl.uint(updateFeeValue.exponent),
        mantissa: Cl.uint(updateFeeValue.mantissa),
      }),
    );
  });

  it("should fail if action mismatches", () => {
    ptgmVaaPayload.action = 0xff;
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
    expect(res.result).toBeErr(Cl.uint(4001));
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

  it("should fail if action mismatches", () => {
    ptgmVaaPayload.action = 0xff;
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
    expect(res.result).toBeErr(Cl.uint(4001));
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

    // Any future call from the now outdated v1 contract should be rejected
    let executionPlanBase = {
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
    };
    res = simnet.callPublicFn(
      pythOracleContractName,
      `verify-and-update-price-feeds`,
      [Cl.bufferFromHex("00"), Cl.tuple(executionPlanBase)],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(4004));
  });

  it("should fail if action mismatches", () => {
    ptgmVaaPayload.action = 0xff;
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
    expect(res.result).toBeErr(Cl.uint(4001));
  });
});

describe("pyth-governance-v1::update-pyth-decoder-contract", () => {
  const accounts = simnet.getAccounts();
  const sender = accounts.get("wallet_1")!;
  const deployer = accounts.get("deployer")!;
  const guardianSet = wormhole.generateGuardianSetKeychain(19);
  let updateDecoderContract = {
    address: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
    contractName: "pyth-decoder-v2",
  };
  let ptgmVaaPayload = pyth.buildPtgmVaaPayload({ updateDecoderContract });

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
      `update-pyth-decoder-contract`,
      [Cl.buffer(vaa), wormholeContract],
      sender,
    );
    let executionPlan = Cl.tuple({
      "pyth-oracle-contract": Cl.contractPrincipal(
        deployer,
        pythOracleContractName,
      ),
      "pyth-decoder-contract": Cl.contractPrincipal(
        updateDecoderContract.address,
        updateDecoderContract.contractName,
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

    // Any future call from the now outdated v1 contract should be rejected
    let executionPlanBase = {
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
    };
    res = simnet.callPublicFn(
      pythOracleContractName,
      `verify-and-update-price-feeds`,
      [Cl.bufferFromHex("00"), Cl.tuple(executionPlanBase)],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(4004));
  });

  it("should not be callable directly", () => {
    let res = simnet.callPublicFn(
      pythDecoderPnauContractName,
      `decode-and-verify-price-feeds`,
      [
        Cl.bufferFromHex("00"),
        Cl.contractPrincipal(deployer, wormholeCoreContractName),
      ],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(4004));
  });

  it("should fail if action mismatches", () => {
    ptgmVaaPayload.action = 0xff;
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
      `update-pyth-decoder-contract`,
      [Cl.buffer(vaa), wormholeContract],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(4001));
  });
});

describe("pyth-governance-v1::update-pyth-store-contract", () => {
  const accounts = simnet.getAccounts();
  const sender = accounts.get("wallet_1")!;
  const deployer = accounts.get("deployer")!;
  const guardianSet = wormhole.generateGuardianSetKeychain(19);
  let updateStoreContract = {
    address: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
    contractName: "pyth-store-v2",
  };
  let ptgmVaaPayload = pyth.buildPtgmVaaPayload({ updateStoreContract });

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
      `update-pyth-store-contract`,
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
        updateStoreContract.address,
        updateStoreContract.contractName,
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

    // Any future call from the now outdated v1 contract should be rejected
    let executionPlanBase = {
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
    };
    res = simnet.callPublicFn(
      pythOracleContractName,
      `verify-and-update-price-feeds`,
      [Cl.bufferFromHex("00"), Cl.tuple(executionPlanBase)],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(4004));

    res = simnet.callPublicFn(
      pythOracleContractName,
      `read-price-feed`,
      [
        Cl.bufferFromHex("00"),
        Cl.contractPrincipal(deployer, pythStorageContractName),
      ],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(4004));
  });

  it("should fail if action mismatches", () => {
    ptgmVaaPayload.action = 0xff;
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
      `update-pyth-store-contract`,
      [Cl.buffer(vaa), wormholeContract],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(4001));
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
    let executionPlanBase = {
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
    };

    let executionPlan = Cl.tuple({
      "pyth-oracle-contract": Cl.contractPrincipal(
        updateOracleContract.address,
        updateOracleContract.contractName,
      ),
      ...executionPlanBase,
    });
    expect(res.result).toBeOk(executionPlan);

    res = simnet.callReadOnlyFn(
      pythGovernanceContractName,
      `get-current-execution-plan`,
      [],
      sender,
    );
    expect(Cl.ok(res.result)).toBeOk(executionPlan);

    // Any future call from the now outdated v1 contract should be rejected
    res = simnet.callPublicFn(
      pythOracleContractName,
      `verify-and-update-price-feeds`,
      [Cl.bufferFromHex("00"), Cl.tuple(executionPlanBase)],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(4004));
  });

  it("should fail if action mismatches", () => {
    ptgmVaaPayload.action = 0xff;
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
    expect(res.result).toBeErr(Cl.uint(4001));
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

  it("should fail if action mismatches", () => {
    ptgmVaaPayload.action = 0xff;
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
      `update-prices-data-sources`,
      [Cl.buffer(vaa), wormholeContract],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(4001));
  });
});

describe("pyth-governance-v1::update-governance-data-source", () => {
  const accounts = simnet.getAccounts();
  const sender = accounts.get("wallet_1")!;
  const guardianSet = wormhole.generateGuardianSetKeychain(19);
  let updateGovernanceDataSource = {
    chain: 0xff,
    address: hexToBytes(
      "FF00000000000000000000000000000000000000000000000000000000000000",
    ),
  };

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
      1n,
    );
  });

  it("should update governance data source on successful updates", () => {
    let ptgmVaaPayload = pyth.buildPtgmVaaPayload({
      updateGovernanceDataSource,
    });
    let payload = pyth.serializePtgmVaaPayloadToBuffer(ptgmVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultGovernanceDataSource,
      sequence: 2n,
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
      `update-governance-data-source`,
      [Cl.buffer(vaa), wormholeContract],
      sender,
    );
    expect(res.result).toBeOk(
      Cl.tuple({
        "emitter-address": Cl.buffer(updateGovernanceDataSource.address),
        "emitter-chain": Cl.uint(updateGovernanceDataSource.chain),
      }),
    );
  });

  it("should fail if action mismatches", () => {
    let ptgmVaaPayload = pyth.buildPtgmVaaPayload({
      updateGovernanceDataSource,
    });
    ptgmVaaPayload.action = 0xff;
    let payload = pyth.serializePtgmVaaPayloadToBuffer(ptgmVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultGovernanceDataSource,
      sequence: 2n,
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
      `update-governance-data-source`,
      [Cl.buffer(vaa), wormholeContract],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(4001));
  });

  it("should fail if magic bytes are mismatching", () => {
    let ptgmVaaPayload = pyth.buildPtgmVaaPayload({
      updateGovernanceDataSource,
    });
    ptgmVaaPayload.magicBytes = hexToBytes("00000000");
    let payload = pyth.serializePtgmVaaPayloadToBuffer(ptgmVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultGovernanceDataSource,
      sequence: 2n,
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
    expect(res.result).toBeErr(Cl.uint(4007));
  });

  it("should fail if target chain id is mismatching", () => {
    let ptgmVaaPayload = pyth.buildPtgmVaaPayload({
      updateGovernanceDataSource,
    });
    ptgmVaaPayload.targetChainId = 0xff;
    let payload = pyth.serializePtgmVaaPayloadToBuffer(ptgmVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultGovernanceDataSource,
      sequence: 2n,
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
    expect(res.result).toBeErr(Cl.uint(4007));
  });

  it("should fail if module is mismatching", () => {
    let ptgmVaaPayload = pyth.buildPtgmVaaPayload({
      updateGovernanceDataSource,
    });
    ptgmVaaPayload.module = 0xff;
    let payload = pyth.serializePtgmVaaPayloadToBuffer(ptgmVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultGovernanceDataSource,
      sequence: 2n,
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
    expect(res.result).toBeErr(Cl.uint(4007));
  });

  it("should fail if sequence is outdated", () => {
    let ptgmVaaPayload = pyth.buildPtgmVaaPayload({
      updateGovernanceDataSource,
    });
    let payload = pyth.serializePtgmVaaPayloadToBuffer(ptgmVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.DefaultGovernanceDataSource,
      sequence: 1n,
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
      `update-governance-data-source`,
      [Cl.buffer(vaa), wormholeContract],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(4005));
  });

  it("should fail if data source is unauthorized", () => {
    let ptgmVaaPayload = pyth.buildPtgmVaaPayload({
      updateGovernanceDataSource,
    });
    let payload = pyth.serializePtgmVaaPayloadToBuffer(ptgmVaaPayload);
    let body = wormhole.buildValidVaaBodySpecs({
      payload,
      emitter: pyth.InitialGovernanceDataSource,
      sequence: 2n,
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
      `update-governance-data-source`,
      [Cl.buffer(vaa), wormholeContract],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(4006));
  });
});

describe("pyth-governance-v1::update-stale-price-threshold", () => {
  const accounts = simnet.getAccounts();
  const sender = accounts.get("wallet_1")!;
  const guardianSet = wormhole.generateGuardianSetKeychain(19);
  let updateStalePriceThreshold = {
    threshold: 60n,
  };
  let ptgmVaaPayload = pyth.buildPtgmVaaPayload({ updateStalePriceThreshold });

  // Before starting the test suite, we have to setup the guardian set.
  beforeEach(async () => {
    wormhole.applyGuardianSetUpdate(
      guardianSet,
      1,
      sender,
      wormholeCoreContractName,
    );
  });

  it("should update stale price threshold on successful updates", () => {
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
      `update-stale-price-threshold`,
      [Cl.buffer(vaa), wormholeContract],
      sender,
    );
    expect(res.result).toBeOk(Cl.uint(updateStalePriceThreshold.threshold));

    res = simnet.callReadOnlyFn(
      pythGovernanceContractName,
      `get-stale-price-threshold`,
      [],
      sender,
    );
    expect(Cl.ok(res.result)).toBeOk(
      Cl.uint(updateStalePriceThreshold.threshold),
    );
  });

  it("should fail if action mismatches", () => {
    ptgmVaaPayload.action = 0xff;
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
      `update-stale-price-threshold`,
      [Cl.buffer(vaa), wormholeContract],
      sender,
    );
    expect(res.result).toBeErr(Cl.uint(4001));
  });
});

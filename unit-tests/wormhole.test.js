// @ts-check

import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { main } from "obscurity-sdk";
import { Cl } from "@stacks/transactions";
import { mainnet_valid_guardians_set_upgrades } from "./constants.js";

describe("Wormhole testsuite", () => {
  const cost = 1000000n;
  const pyth_oracle_v1_contract_name = "pyth-oracle-v1";
  let pyth_oracle_v1_contract_addr;
  let wormhole_core_v1_contract_name = "wormhole-core-v1";
  let wormhole_core_v1_contract_addr;
  let deployer;
  let sender;
  /** @type import("obscurity-sdk").Session */
  let session;

  before(async () => {
    session = await main();
    await session.initSession(process.cwd(), "./Clarinet.toml");
    
    const accounts = session.getAccounts();
    deployer = accounts.get("deployer");
    pyth_oracle_v1_contract_addr = `${deployer}.${pyth_oracle_v1_contract_name}`;
    wormhole_core_v1_contract_addr = `${deployer}.${wormhole_core_v1_contract_name}`;
    sender = accounts.get("wallet_1");
  });

  it("ensure that legitimate price attestations are validated", () => {

  //   const oracleResult = chain.callReadOnlyFn(
  //     "pyth-oracle-v1",
  //     "read-price-feed",
  //     [types.buff(feedIdBtcUsd)],
  //     wallet_1.address
  // );


    // const res = session.mine("pyth-oracle-v1", "read-price-feed", [Cl.bufferFromHex("00")], sender);

    // assert.deepEqual(res.result, Cl.int(0));
    // assert.equal(session.blockHeight, 1);

    // console.error("Here");

    const vaaRotation1 = Cl.bufferFromHex(mainnet_valid_guardians_set_upgrades[0].vaa);
    let publicKeysRotation1 = [];
    for (let key of mainnet_valid_guardians_set_upgrades[0].keys) {
        publicKeysRotation1.push(Cl.bufferFromHex(key));
    }

    const vaaRotation2 = Cl.bufferFromHex(mainnet_valid_guardians_set_upgrades[1].vaa);
    let publicKeysRotation2 = [];
    for (let key of mainnet_valid_guardians_set_upgrades[1].keys) {
        publicKeysRotation2.push(Cl.bufferFromHex(key));
    }

    const vaaRotation3 = Cl.bufferFromHex(mainnet_valid_guardians_set_upgrades[2].vaa);
    let publicKeysRotation3 = [];
    for (let key of mainnet_valid_guardians_set_upgrades[2].keys) {
        publicKeysRotation3.push(Cl.bufferFromHex(key));
    }

    console.warn(vaaRotation3);


    session.callPublicFn(wormhole_core_v1_contract_name, "update-guardians-set", [vaaRotation1, Cl.list(publicKeysRotation1)], sender);

    // session.callPublicFn(wormhole_core_v1_contract_addr, "update-guardians-set", [vaaRotation2, Cl.list(publicKeysRotation2)], sender);

    // session.callPublicFn(wormhole_core_v1_contract_addr, "update-guardians-set", [vaaRotation3, Cl.list(publicKeysRotation3)], sender);

    // // assert: review returned data, contract state, and other requirements
    // assertEquals(block.receipts.length, 3);
    // const rotation1 = block.receipts[0].result;
    // rotation1.expectOk()

    // const rotation2 = block.receipts[1].result;
    // rotation2.expectOk()

    // const rotation3 = block.receipts[2].result;
    // rotation3.expectOk()
  });
});

// @ts-check

import { after, before, describe, it } from "node:test";
import fs from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import initVM from "obscurity-sdk";
import { Cl } from "@stacks/transactions";
import { mainnet_valid_guardians_set_upgrades } from "./constants.js";

let wormhole_core_v1_contract_name = "wormhole-core-v1";
let wormhole_core_v1_contract_addr;
let deployer;
let sender;
/** @type import("../../clarinet/components/clarinet-sdk/dist/index").ClarityVM */
let vm;

describe("Wormhole testsuite", () => {
  before(async () => {
    vm = await initVM();
    await vm.initSession(process.cwd(), "./Clarinet.toml");

    const accounts = vm.getAccounts();
    deployer = accounts.get("deployer");
    wormhole_core_v1_contract_addr = `${deployer}.${wormhole_core_v1_contract_name}`;
    sender = accounts.get("wallet_1");
  });

  after(() => {
    const lcov = vm.terminate();
    fs.appendFileSync(path.join(process.cwd(), "lcov.info"), lcov);
  });

  it("ensure that guardians set can be rotated", () => {
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

    vm.callPublicFn(
      wormhole_core_v1_contract_name,
      "update-guardians-set",
      [vaaRotation1, Cl.list(publicKeysRotation1)],
      sender
    );

    vm.callPublicFn(
      wormhole_core_v1_contract_name,
      "update-guardians-set",
      [vaaRotation2, Cl.list(publicKeysRotation2)],
      sender
    );

    vm.callPublicFn(
      wormhole_core_v1_contract_name,
      "update-guardians-set",
      [vaaRotation3, Cl.list(publicKeysRotation3)],
      sender
    );

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

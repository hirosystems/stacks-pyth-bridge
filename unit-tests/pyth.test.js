// @ts-check

import { it } from "node:test";
import { Cl } from "@stacks/transactions";
import { mainnet_valid_guardians_set_upgrades, mainnet_valid_pfs } from "./constants.js";
import { clarinetTest } from "./clarinetTest.js";

const pyth_oracle_v1_contract_name = "pyth-oracle-v1";
const wormhole_core_v1_contract_name = "wormhole-core-v1";

clarinetTest("Pyth testsuite", (vm) => {
  const accounts = vm.getAccounts();
  const deployer = accounts.get("deployer");
  const pyth_oracle_v1_contract_addr = `${deployer}.${pyth_oracle_v1_contract_name}`;
  const wormhole_core_v1_contract_addr = `${deployer}.${wormhole_core_v1_contract_name}`;
  const sender = accounts.get("wallet_1");
  if (!sender) throw new Error("invalid account");

  it("ensure that legitimate price attestations are validated", () => {
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

    const vaaBytes = Cl.bufferFromHex(mainnet_valid_pfs[0]);

    let res = vm.callPublicFn(
      pyth_oracle_v1_contract_name,
      "update-prices-feeds",
      [Cl.list([vaaBytes])],
      sender
    );

    console.log(res);
  });
});

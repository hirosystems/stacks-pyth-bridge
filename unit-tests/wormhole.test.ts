import { Cl, ClarityType } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import { tx } from "@hirosystems/clarinet-sdk";

import { mainnet_valid_guardians_set_upgrades } from "./constants";

const wormhole_core_v1_contract_name = "wormhole-core-dev-preview-1";

describe("Wormhole testsuite", () => {
  const accounts = vm.getAccounts();
  const sender = accounts.get("wallet_1")!;

  it("ensure that guardians set can be rotated", () => {
    const vaaRotation1 = Cl.bufferFromHex(mainnet_valid_guardians_set_upgrades[0].vaa);
    let publicKeysRotation1 = mainnet_valid_guardians_set_upgrades[0].keys.map(Cl.bufferFromHex);

    const vaaRotation2 = Cl.bufferFromHex(mainnet_valid_guardians_set_upgrades[1].vaa);
    let publicKeysRotation2 = mainnet_valid_guardians_set_upgrades[1].keys.map(Cl.bufferFromHex);

    const vaaRotation3 = Cl.bufferFromHex(mainnet_valid_guardians_set_upgrades[2].vaa);
    let publicKeysRotation3 = mainnet_valid_guardians_set_upgrades[2].keys.map(Cl.bufferFromHex);

    const block1 = vm.mineBlock([
      tx.callPublicFn(
        wormhole_core_v1_contract_name,
        "update-guardians-set",
        [vaaRotation1, Cl.list(publicKeysRotation1)],
        sender
      ),
      tx.callPublicFn(
        wormhole_core_v1_contract_name,
        "update-guardians-set",
        [vaaRotation2, Cl.list(publicKeysRotation2)],
        sender
      ),
      tx.callPublicFn(
        wormhole_core_v1_contract_name,
        "update-guardians-set",
        [vaaRotation3, Cl.list(publicKeysRotation3)],
        sender
      ),
    ]);

    expect(block1).toHaveLength(3);
    block1.forEach((b) => {
      expect(b.result).toHaveClarityType(ClarityType.ResponseOk);
    });
  });
});

import { Cl, ClarityType, ResponseOkCV } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import { tx } from "@hirosystems/clarinet-sdk";

import { mainnet_valid_guardians_set_upgrades, mainnet_valid_pfs } from "./constants";

const pyth_oracle_v1_contract_name = "pyth-oracle-dev-preview-1";
const wormhole_core_v1_contract_name = "wormhole-core-dev-preview-1";

describe("Pyth testsuite", () => {
  const accounts = vm.getAccounts();
  const sender = accounts.get("wallet_1")!;

  it("ensure that legitimate price attestations are validated", () => {
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

    const vaaBytes = Cl.bufferFromHex(mainnet_valid_pfs[0]);

    let res = vm.callPublicFn(
      pyth_oracle_v1_contract_name,
      "update-prices-feeds",
      [Cl.list([vaaBytes])],
      sender
    );

    const result = res.result;
    expect(result).toHaveClarityType(ClarityType.ResponseOk);

    expect((result as ResponseOkCV).value).toBeList([
      Cl.bufferFromHex("e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"),
    ]);
  });
});

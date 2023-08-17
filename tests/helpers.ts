import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.6.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.170.0/testing/asserts.ts";
import { hexToBuffer } from "https://deno.land/x/hextools@v1.0.0/mod.ts";
import { mainnet_valid_guardians_set_upgrades } from "./constants.ts";

export const executeGuardiansRotations = (chain: Chain, account: Account) => {
  const vaaRotation1 = hexToBuffer(mainnet_valid_guardians_set_upgrades[0].vaa);
  let publicKeysRotation1 = [];
  for (let key of mainnet_valid_guardians_set_upgrades[0].keys) {
    publicKeysRotation1.push(types.buff(hexToBuffer(key)));
  }

  const vaaRotation2 = hexToBuffer(mainnet_valid_guardians_set_upgrades[1].vaa);
  let publicKeysRotation2 = [];
  for (let key of mainnet_valid_guardians_set_upgrades[1].keys) {
    publicKeysRotation2.push(types.buff(hexToBuffer(key)));
  }

  const vaaRotation3 = hexToBuffer(mainnet_valid_guardians_set_upgrades[2].vaa);
  let publicKeysRotation3 = [];
  for (let key of mainnet_valid_guardians_set_upgrades[2].keys) {
    publicKeysRotation3.push(types.buff(hexToBuffer(key)));
  }

  let block = chain.mineBlock([
    Tx.contractCall(
      "wormhole-core-dev-preview-1",
      "update-guardians-set",
      [types.buff(vaaRotation1), types.list(publicKeysRotation1)],
      account.address
    ),
    Tx.contractCall(
      "wormhole-core-dev-preview-1",
      "update-guardians-set",
      [types.buff(vaaRotation2), types.list(publicKeysRotation2)],
      account.address
    ),
    Tx.contractCall(
      "wormhole-core-dev-preview-1",
      "update-guardians-set",
      [types.buff(vaaRotation3), types.list(publicKeysRotation3)],
      account.address
    ),
  ]);

  // assert: review returned data, contract state, and other requirements
  assertEquals(block.receipts.length, 3);
  const rotation1 = block.receipts[0].result;
  rotation1.expectOk();

  const rotation2 = block.receipts[1].result;
  rotation2.expectOk();

  const rotation3 = block.receipts[2].result;
  rotation3.expectOk();
};

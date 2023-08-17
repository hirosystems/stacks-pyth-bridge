import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.6.0/index.ts";
import {
  assertEquals,
  assertObjectMatch,
  assertArrayIncludes,
} from "https://deno.land/std@0.170.0/testing/asserts.ts";
import { hexToBuffer } from "https://deno.land/x/hextools@v1.0.0/mod.ts";

import { mainnet_valid_pfs } from "./constants.ts";
import { executeGuardiansRotations } from "./helpers.ts";

Clarinet.test({
  name: "Ensure that valid price attestations can be ingested and recorded",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange: set up the chain, state, and other required elements
    const wallet_1 = accounts.get("wallet_1")!;
    executeGuardiansRotations(chain, wallet_1);

    const vaaBytes = hexToBuffer(mainnet_valid_pfs[0]);

    const block = chain.mineBlock([
      Tx.contractCall(
        "pyth-oracle-dev-preview-1",
        "update-prices-feeds",
        [types.list([types.buff(vaaBytes)])],
        wallet_1.address
      ),
    ]);

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 3);
    const priceUpdate = block.receipts[0].result;
    // Ensure that the BTC_USD price feed id was the only updated feed
    assertArrayIncludes(priceUpdate.expectOk().expectList(), [
      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    ]);

    const feedIdBtcUsd = hexToBuffer(
      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
    );
    const oracleResult = chain.callReadOnlyFn(
      "pyth-oracle-dev-preview-1",
      "read-price-feed",
      [types.buff(feedIdBtcUsd)],
      wallet_1.address
    );
    assertObjectMatch(oracleResult.result.expectOk().expectTuple(), {
      "attestation-time": "u1686854317",
      conf: "u2064471426",
      "ema-conf": "u1891952230",
      "ema-price": "2507095440000",
      expo: "4294967288",
      "prev-conf": "u2064471426",
      "prev-price": "2515455528574",
      "prev-publish-time": "u1686854316",
      price: "2515455528574",
      "publish-time": "u1686854317",
      status: "u1",
    });
  },
});

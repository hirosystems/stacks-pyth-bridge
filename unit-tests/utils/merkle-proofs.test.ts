import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const merkle_contract_name = "hk-merkle-tree-keccak160-v1";

// The test vectors executed in the following test suite are coming from:
// https://github.com/pyth-network/pyth-crosschain/blob/main/target_chains/aptos/contracts/sources/merkle.move

describe("hiro-kit::hk-merkle-tree-keccak160", () => {
  const accounts = simnet.getAccounts();
  const sender = accounts.get("wallet_1")!;

  const setupTree = () => {
    //
    //   h1  h2  h3   h4
    //    \ /     \  /
    //     h5      h6
    //        \  /
    //         h7
    //
    let h1 = simnet.callReadOnlyFn(
      merkle_contract_name,
      "hash-leaf",
      [Cl.bufferFromHex("adad11")],
      sender,
    ).result;
    let h2 = simnet.callReadOnlyFn(
      merkle_contract_name,
      "hash-leaf",
      [Cl.bufferFromHex("adad12")],
      sender,
    ).result;
    let h3 = simnet.callReadOnlyFn(
      merkle_contract_name,
      "hash-leaf",
      [Cl.bufferFromHex("adad13")],
      sender,
    ).result;
    let h4 = simnet.callReadOnlyFn(
      merkle_contract_name,
      "hash-leaf",
      [Cl.bufferFromHex("adad14")],
      sender,
    ).result;
    let h5 = simnet.callReadOnlyFn(
      merkle_contract_name,
      "hash-nodes",
      [h1, h2],
      sender,
    ).result;
    let h6 = simnet.callReadOnlyFn(
      merkle_contract_name,
      "hash-nodes",
      [h3, h4],
      sender,
    ).result;
    let h7 = simnet.callReadOnlyFn(
      merkle_contract_name,
      "hash-nodes",
      [h5, h6],
      sender,
    ).result;
    return [h1, h2, h3, h4, h5, h6, h7];
  };

  it("hash leaf", () => {
    let res = simnet.callReadOnlyFn(
      merkle_contract_name,
      "hash-leaf",
      [
        Cl.bufferFromHex(
          "00640000000000000000000000000000000000000000000000000000000000000000000000000000640000000000000064000000640000000000000064000000000000006400000000000000640000000000000064",
        ),
      ],
      sender,
    );
    expect(res.result).toStrictEqual(
      Cl.bufferFromHex("afc6a8ac466430f35895055f8a4c951785dad5ce"),
    );
  });

  it("hash node", () => {
    let h1 = Cl.bufferFromHex("05c51b04b820c0f704e3fdd2e4fc1e70aff26dff");
    let h2 = Cl.bufferFromHex("1e108841c8d21c7a5c4860c8c3499c918ea9e0ac");
    let res = simnet.callReadOnlyFn(
      merkle_contract_name,
      "hash-nodes",
      [h1, h2],
      sender,
    );
    expect(res.result).toStrictEqual(
      Cl.bufferFromHex("2d0e4fde68184c7ce8af426a0865bd41ef84dfa4"),
    );
  });

  it("check valid proofs", () => {
    let [h1, h2, h3, h4, h5, h6, h7] = setupTree();

    expect(
      simnet.callReadOnlyFn(
        merkle_contract_name,
        "check-proof",
        [h7, Cl.bufferFromHex("adad11"), Cl.list([h2, h6])],
        sender,
      ).result,
    ).toStrictEqual(Cl.bool(true));

    expect(
      simnet.callReadOnlyFn(
        merkle_contract_name,
        "check-proof",
        [h7, Cl.bufferFromHex("adad14"), Cl.list([h3, h5])],
        sender,
      ).result,
    ).toStrictEqual(Cl.bool(true));

    expect(
      simnet.callReadOnlyFn(
        merkle_contract_name,
        "check-proof",
        [h7, Cl.bufferFromHex("adad14"), Cl.list([h1, h4])],
        sender,
      ).result,
    ).toStrictEqual(Cl.bool(false));
  });

  it("check valid proofs subtree", () => {
    let [h1, h2, h3, h4, h5, h6, _] = setupTree();

    expect(
      simnet.callReadOnlyFn(
        merkle_contract_name,
        "check-proof",
        [h5, Cl.bufferFromHex("adad12"), Cl.list([h1])],
        sender,
      ).result,
    ).toStrictEqual(Cl.bool(true));

    expect(
      simnet.callReadOnlyFn(
        merkle_contract_name,
        "check-proof",
        [h5, Cl.bufferFromHex("adad11"), Cl.list([h2])],
        sender,
      ).result,
    ).toStrictEqual(Cl.bool(true));

    expect(
      simnet.callReadOnlyFn(
        merkle_contract_name,
        "check-proof",
        [h6, Cl.bufferFromHex("adad14"), Cl.list([h3])],
        sender,
      ).result,
    ).toStrictEqual(Cl.bool(true));

    expect(
      simnet.callReadOnlyFn(
        merkle_contract_name,
        "check-proof",
        [h6, Cl.bufferFromHex("adad13"), Cl.list([h4])],
        sender,
      ).result,
    ).toStrictEqual(Cl.bool(true));
  });

  it("check invalid proofs", () => {
    let [h1, h2, h3, h4, h5, h6, h7] = setupTree();

    expect(
      simnet.callReadOnlyFn(
        merkle_contract_name,
        "check-proof",
        [h7, Cl.bufferFromHex("dead"), Cl.list([h2, h6])],
        sender,
      ).result,
    ).toStrictEqual(Cl.bool(false));

    expect(
      simnet.callReadOnlyFn(
        merkle_contract_name,
        "check-proof",
        [h7, Cl.bufferFromHex("dead"), Cl.list([h3, h5])],
        sender,
      ).result,
    ).toStrictEqual(Cl.bool(false));

    expect(
      simnet.callReadOnlyFn(
        merkle_contract_name,
        "check-proof",
        [h7, Cl.bufferFromHex("dead"), Cl.list([h1, h4])],
        sender,
      ).result,
    ).toStrictEqual(Cl.bool(false));
  });
});

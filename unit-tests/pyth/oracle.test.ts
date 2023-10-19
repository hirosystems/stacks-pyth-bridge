import { Cl, ClarityType } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";
import { ParsedTransactionResult, tx } from "@hirosystems/clarinet-sdk";
import { apnuMainnetVaas } from "./fixtures";
import { wormhole } from "../wormhole/helper";

const pythOracleContractName = "pyth-oracle-v1";
const pythDecoderPnauContractName = "pyth-pnau-decoder-v1";
const pythStorageContractName = "pyth-store-v1";
const wormholeCoreContractName = "wormhole-core-v1";

describe("pyth-oracle-v1::decode-and-verify-price-feeds mainnet VAAs", () => {
    const accounts = simnet.getAccounts();
    const sender = accounts.get("wallet_1")!;

    let block: ParsedTransactionResult[] | undefined = undefined;

    // Before starting the test suite, we have to setup the guardian set.
    beforeEach(async () => {
        block = wormhole.applyMainnetGuardianSetUpdates(sender, wormholeCoreContractName)
    })

    it("should succeed handling the 3 guardians rotations", () => {
        expect(block!).toHaveLength(3);
        block!.forEach((b: ParsedTransactionResult) => {
            expect(b.result).toHaveClarityType(ClarityType.ResponseOk);
        });
    });

    it("should succeed handling PNAU mainnet payloads", () => {
        const vaaBytes = Cl.bufferFromHex(apnuMainnetVaas[0]);
        const executionPlan = Cl.tuple({
          'pyth-storage-contract': Cl.contractPrincipal(simnet.deployer, pythStorageContractName),
          'pyth-decoder-contract': Cl.contractPrincipal(simnet.deployer, pythDecoderPnauContractName),
          'wormhole-core-contract': Cl.contractPrincipal(simnet.deployer, wormholeCoreContractName),
        });
        
        let res = simnet.callPublicFn(
            pythOracleContractName,
          "verify-and-update-price-feeds",
          [vaaBytes, executionPlan],
          sender
        );
    
        const result = res.result;
        console.log(Cl.prettyPrint(result, 2));
    });
});

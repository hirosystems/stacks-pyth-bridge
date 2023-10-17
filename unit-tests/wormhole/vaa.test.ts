import { Cl } from "@stacks/transactions";
import { expect, describe } from "vitest";
import { it, fc } from '@fast-check/vitest';
import { wormhole } from './helper';

const contract_name = "wormhole-core-v1";
const verbosity = 0;

describe("wormhole-core-v1::parse-vaa", () => {
    const accounts = simnet.getAccounts();
    const sender = accounts.get("wallet_1")!;
    const keychain = wormhole.generateGuardianSetKeychain(19);

    it("should succeed if the vaa is valid", () => {
        let body = wormhole.buildValidVaaBodySpecs();   
        let headerSpecs = wormhole.buildValidVaaHeaderSpecs(keychain, body);

        fc.assert(fc.property(wormhole.fc_ext.vaaHeader(headerSpecs, 19), ([version, guardianSetIndex, providedSignatures, generatedSignatures]) => {
            let consolidatedSignatures = [...(providedSignatures as Uint8Array[]), ...(generatedSignatures as Uint8Array[])];
            let header = wormhole.assembleVaaHeader(version, guardianSetIndex, consolidatedSignatures)
            let vaa = wormhole.serializeVaa(header, body);
            let expectedResult = wormhole.expectedDecodedVaa(header, body, keychain);

            const res = simnet.callReadOnlyFn(
                contract_name,
                `parse-vaa`,
                [Cl.buffer(vaa)],
                sender
            );
            res.result
            expect(res.result).toBeOk(expectedResult);
        }), 
        { verbose: verbosity })
    });
})

describe("wormhole-core-v1::update-guardians-set", () => {
    const accounts = simnet.getAccounts();
    const sender = accounts.get("wallet_1")!;
    const keychain = wormhole.generateGuardianSetKeychain(19);

    it("should fail if the vaa is valid", () => {
        // Before performing this test, we need to setup the guardian set
        let guardianRotationPayload = wormhole.buildGuardianRotationVaaPayload(keychain, 2, 0, 1, wormhole.validGuardianRotationModule);
        console.log(guardianRotationPayload.length);
        let body = wormhole.buildValidVaaBodySpecs({ payload: guardianRotationPayload });   
        let header = wormhole.buildValidVaaHeader(keychain, body, { version: 2, guardianSetId: 0, signatures: [] });
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of keychain) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        console.log(Cl.prettyPrint(Cl.list(uncompressedPublicKey)));
        const res = simnet.callPublicFn(
            contract_name,
            `update-guardians-set`,
            [Cl.buffer(vaa), Cl.list(uncompressedPublicKey)],
            sender
        );
        expect(res.result).toBeOk(Cl.uint(1));
    });
})

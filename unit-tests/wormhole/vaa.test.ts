import { Cl } from "@stacks/transactions";
import { expect, describe } from "vitest";
import { it, fc } from '@fast-check/vitest';
import { wormhole } from './helper';

const contract_name = "wormhole-core-v1";
const verbosity = 0;

describe("wormhole-core-v1::parse-vaa success", () => {
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
            let [decodedVaa, guardiansPublicKeys] = wormhole.expectedDecodedVaa(header, body, keychain);

            const res = simnet.callReadOnlyFn(
                contract_name,
                `parse-vaa`,
                [Cl.buffer(vaa)],
                sender
            );
            res.result
            expect(res.result).toBeOk(Cl.tuple({
                "vaa": decodedVaa,
                "recovered-public-keys": Cl.list(guardiansPublicKeys)
            }));
        }), 
        { verbose: verbosity })
    });
})

describe("wormhole-core-v1::update-guardians-set failures", () => {
    const accounts = simnet.getAccounts();
    const sender = accounts.get("wallet_1")!;
    const keychain = wormhole.generateGuardianSetKeychain(19);

    it("should fail if the chain is invalid", () => {
        // Before performing this test, we need to setup the guardian set
        let guardianRotationPayload = wormhole.buildGuardianRotationVaaPayload(keychain, 2, 1, 1, wormhole.validGuardianRotationModule);
        let body = wormhole.buildValidVaaBodySpecs({ payload: guardianRotationPayload });   
        let header = wormhole.buildValidVaaHeader(keychain, body, { version: 2, guardianSetId: 0, signatures: [] });
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of keychain) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        const res = simnet.callPublicFn(
            contract_name,
            `update-guardians-set`,
            [Cl.buffer(vaa), Cl.list(uncompressedPublicKey)],
            sender
        );
        expect(res.result).toBeErr(Cl.uint(1303));
    });

    it("should fail if the action is invalid", () => {
        // Before performing this test, we need to setup the guardian set
        let guardianRotationPayload = wormhole.buildGuardianRotationVaaPayload(keychain, 0, 0, 1, wormhole.validGuardianRotationModule);
        let body = wormhole.buildValidVaaBodySpecs({ payload: guardianRotationPayload });   
        let header = wormhole.buildValidVaaHeader(keychain, body, { version: 2, guardianSetId: 0, signatures: [] });
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of keychain) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        const res = simnet.callPublicFn(
            contract_name,
            `update-guardians-set`,
            [Cl.buffer(vaa), Cl.list(uncompressedPublicKey)],
            sender
        );
        expect(res.result).toBeErr(Cl.uint(1302));
    });

    it("should fail if the set id is invalid", () => {
        // Before performing this test, we need to setup the guardian set
        let guardianRotationPayload = wormhole.buildGuardianRotationVaaPayload(keychain, 2, 0, 0, wormhole.validGuardianRotationModule);
        let body = wormhole.buildValidVaaBodySpecs({ payload: guardianRotationPayload });   
        let header = wormhole.buildValidVaaHeader(keychain, body, { version: 2, guardianSetId: 0, signatures: [] });
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of keychain) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        const res = simnet.callPublicFn(
            contract_name,
            `update-guardians-set`,
            [Cl.buffer(vaa), Cl.list(uncompressedPublicKey)],
            sender
        );
        expect(res.result).toBeErr(Cl.uint(1304));
    });

    it("should fail if the module is invalid", () => {
        // Before performing this test, we need to setup the guardian set
        let guardianRotationPayload = wormhole.buildGuardianRotationVaaPayload(keychain, 2, 0, 1, Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'));
        let body = wormhole.buildValidVaaBodySpecs({ payload: guardianRotationPayload });   
        let header = wormhole.buildValidVaaHeader(keychain, body, { version: 2, guardianSetId: 0, signatures: [] });
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of keychain) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        const res = simnet.callPublicFn(
            contract_name,
            `update-guardians-set`,
            [Cl.buffer(vaa), Cl.list(uncompressedPublicKey)],
            sender
        );
        expect(res.result).toBeErr(Cl.uint(1301));
    });
})

describe("wormhole-core-v1::update-guardians-set success", () => {
    const accounts = simnet.getAccounts();
    const sender = accounts.get("wallet_1")!;
    const keychain = wormhole.generateGuardianSetKeychain(19);

    it("should succeed if the vaa is valid", () => {
        // Before performing this test, we need to setup the guardian set
        let guardianRotationPayload = wormhole.buildGuardianRotationVaaPayload(keychain, 2, 0, 1, wormhole.validGuardianRotationModule);
        let body = wormhole.buildValidVaaBodySpecs({ payload: guardianRotationPayload });   
        let header = wormhole.buildValidVaaHeader(keychain, body, { version: 2, guardianSetId: 0, signatures: [] });
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of keychain) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        let [expectedDecodedVaa, _] = wormhole.expectedDecodedVaa(header, body, keychain);
        const res = simnet.callPublicFn(
            contract_name,
            `update-guardians-set`,
            [Cl.buffer(vaa), Cl.list(uncompressedPublicKey)],
            sender
        );
        expect(res.result).toBeOk(Cl.tuple({
            'result': Cl.tuple({
                'guardians-eth-addresses': Cl.list(keychain.map((g) => Cl.buffer(g.ethereumAddress))),
                'guardians-public-keys': Cl.list(keychain.map((g) => Cl.buffer(g.uncompressedPublicKey))),
            }),
            'vaa': expectedDecodedVaa
        }));
    });
})

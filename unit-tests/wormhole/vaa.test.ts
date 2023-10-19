import { Cl, ClarityType } from "@stacks/transactions";
import { expect, describe, beforeEach } from "vitest";
import { it, fc } from '@fast-check/vitest';
import { wormhole } from './helper';
import { ParsedTransactionResult, tx } from "@hirosystems/clarinet-sdk";

const contractName = "wormhole-core-v1";
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
                contractName,
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
        let header = wormhole.buildValidVaaHeader(keychain, body, { version: 1, guardianSetId: 0, signatures: [] });
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of keychain) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        const res = simnet.callPublicFn(
            contractName,
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
        let header = wormhole.buildValidVaaHeader(keychain, body, { version: 1, guardianSetId: 0, signatures: [] });
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of keychain) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        const res = simnet.callPublicFn(
            contractName,
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
        let header = wormhole.buildValidVaaHeader(keychain, body, { version: 1, guardianSetId: 0, signatures: [] });
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of keychain) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        const res = simnet.callPublicFn(
            contractName,
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
        let header = wormhole.buildValidVaaHeader(keychain, body, { version: 1, guardianSetId: 0, signatures: [] });
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of keychain) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        const res = simnet.callPublicFn(
            contractName,
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
    const guardianSet1Keys = wormhole.generateGuardianSetKeychain(19);
    const guardianSet2Keys = wormhole.generateGuardianSetKeychain(19);
    let guardianSet1 = Cl.tuple({});

    // Before starting the test suite, we have to setup the guardian set.
    beforeEach(async () => {
        let [result, vaaHeader, vaaBody] = wormhole.applyGuardianSetUpdate(guardianSet1Keys, 1, sender, contractName)
        let [expectedDecodedVaa, _] = wormhole.expectedDecodedVaa(
            vaaHeader as wormhole.VaaHeader,
            vaaBody as wormhole.VaaBody,
            guardianSet1Keys);

        guardianSet1 = Cl.tuple({
            "set-id": Cl.uint(1),
            "guardians": Cl.list(guardianSet1Keys.map((g) => Cl.tuple({
                "compressed-public-key": Cl.buffer(g.compressedPublicKey),
                "uncompressed-public-key": Cl.buffer(g.uncompressedPublicKey)
            })))
        });

        expect(result).toBeOk(Cl.tuple({
            'result': Cl.tuple({
                'guardians-eth-addresses': Cl.list(guardianSet1Keys.map((g) => Cl.buffer(g.ethereumAddress))),
                'guardians-public-keys': Cl.list(guardianSet1Keys.map((g) => Cl.buffer(g.uncompressedPublicKey))),
            }),
            'vaa': expectedDecodedVaa
        }));
    })

    it("should return the set 1 as active", () => {
        let res = simnet.callPublicFn(
            contractName,
            `get-active-guardian-set`,
            [],
            sender
        ).result;
        expect(res).toBeOk(guardianSet1);
    });

    it("should successfully handle subsequent rotation", () => {
        const guardianSet2 = Cl.tuple({
            "set-id": Cl.uint(2),
            "guardians": Cl.list(guardianSet2Keys.map((g) => Cl.tuple({
                "compressed-public-key": Cl.buffer(g.compressedPublicKey),
                "uncompressed-public-key": Cl.buffer(g.uncompressedPublicKey)
            })))
        });
        // Before performing this test, we need to setup the guardian set
        const guardianRotationPayload = wormhole.buildGuardianRotationVaaPayload(guardianSet2Keys, 2, 0, 2, wormhole.validGuardianRotationModule);
        const body = wormhole.buildValidVaaBodySpecs({ payload: guardianRotationPayload });
        const header = wormhole.buildValidVaaHeader(guardianSet1Keys, body, { version: 1, guardianSetId: 1 });
        const vaa = wormhole.serializeVaa(header, body);
        const uncompressedPublicKey = [];
        for (let guardian of guardianSet2Keys) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        const [expectedDecodedVaa, _] = wormhole.expectedDecodedVaa(header, body, guardianSet1Keys);
        let res = simnet.mineBlock([
            tx.callPublicFn(
                contractName,
                `update-guardians-set`,
                [Cl.buffer(vaa), Cl.list(uncompressedPublicKey)],
                sender
            )
        ])[0].result
        expect(res).toBeOk(Cl.tuple({
            'result': Cl.tuple({
                'guardians-eth-addresses': Cl.list(guardianSet2Keys.map((g) => Cl.buffer(g.ethereumAddress))),
                'guardians-public-keys': Cl.list(guardianSet2Keys.map((g) => Cl.buffer(g.uncompressedPublicKey))),
            }),
            'vaa': expectedDecodedVaa
        }));

        res = simnet.callPublicFn(
            contractName,
            `get-active-guardian-set`,
            [],
            sender
        ).result;
        expect(res).toBeOk(guardianSet2);
    });

    it("should reject subsequent update if there is a eth address / uncompressed public keys mismatch", () => {
        let guardianSet2KeysSubset = guardianSet2Keys.splice(0, 12);
        // Before performing this test, we need to setup the guardian set
        const guardianRotationPayload = wormhole.buildGuardianRotationVaaPayload(guardianSet2KeysSubset, 2, 0, 2, wormhole.validGuardianRotationModule);
        const body = wormhole.buildValidVaaBodySpecs({ payload: guardianRotationPayload });
        const header = wormhole.buildValidVaaHeader(guardianSet1Keys, body, { version: 1, guardianSetId: 1 });
        const vaa = wormhole.serializeVaa(header, body);
        const uncompressedPublicKey = [];
        for (let guardian of guardianSet2Keys) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        let res = simnet.mineBlock([
            tx.callPublicFn(
                contractName,
                `update-guardians-set`,
                [Cl.buffer(vaa), Cl.list(uncompressedPublicKey)],
                sender
            )
        ])[0].result
        expect(res).toBeErr(Cl.uint(1207));
    });
})

describe("wormhole-core-v1::parse-and-verify-vaa success", () => {
    const accounts = simnet.getAccounts();
    const sender = accounts.get("wallet_1")!;
    const guardianSet1Keys = wormhole.generateGuardianSetKeychain(19);
    // const guardianSet2Keys = wormhole.generateGuardianSetKeychain(19);

    // Before starting the test suite, we have to setup the guardian set.
    beforeEach(async () => {
        wormhole.applyGuardianSetUpdate(guardianSet1Keys, 1, sender, contractName)
    })

    it("should succeed if the vaa is valid", () => {
        let body = wormhole.buildValidVaaBodySpecs();
        let headerSpecs = wormhole.buildValidVaaHeaderSpecs(guardianSet1Keys, body);

        fc.assert(fc.property(wormhole.fc_ext.vaaHeader(headerSpecs, 19), ([version, guardianSetIndex, providedSignatures, generatedSignatures]) => {
            let consolidatedSignatures = [...(providedSignatures as Uint8Array[]), ...(generatedSignatures as Uint8Array[])];
            let header = wormhole.assembleVaaHeader(version, guardianSetIndex, consolidatedSignatures)
            let vaa = wormhole.serializeVaa(header, body);
            let [decodedVaa, guardiansPublicKeys] = wormhole.expectedDecodedVaa(header, body, guardianSet1Keys);

            const res = simnet.callReadOnlyFn(
                contractName,
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

    it("should succeed if quorum is just met", () => {
        // Before performing this test, we need to setup the guardian set
        let cutoff = 13;
        let guardianSet1KeysSubset = guardianSet1Keys.splice(0, cutoff);
        let body = wormhole.buildValidVaaBodySpecs();
        let header = wormhole.buildValidVaaHeader(guardianSet1KeysSubset, body, { version: 1, guardianSetId: 1 });
        let vaa = wormhole.serializeVaa(header, body);
        let [decodedVaa, _] = wormhole.expectedDecodedVaa(header, body, guardianSet1KeysSubset);

        const res = simnet.callReadOnlyFn(
            contractName,
            `parse-and-verify-vaa`,
            [Cl.buffer(vaa)],
            sender
        );
        expect(res.result).toBeOk(decodedVaa)
    });
})

describe("wormhole-core-v1::parse-and-verify-vaa failures", () => {
    const accounts = simnet.getAccounts();
    const sender = accounts.get("wallet_1")!;
    const guardianSet1Keys = wormhole.generateGuardianSetKeychain(19);

    // Before starting the test suite, we have to setup the guardian set.
    beforeEach(async () => {
        wormhole.applyGuardianSetUpdate(guardianSet1Keys, 1, sender, contractName)
    })

    it("should fail if the version is invalid", () => {
        // Before performing this test, we need to setup the guardian set
        let body = wormhole.buildValidVaaBodySpecs();
        let header = wormhole.buildValidVaaHeader(guardianSet1Keys, body, { version: 2, guardianSetId: 1 });
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of guardianSet1Keys) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        const res = simnet.callReadOnlyFn(
            contractName,
            `parse-and-verify-vaa`,
            [Cl.buffer(vaa)],
            sender
        );
        expect(res.result).toBeErr(Cl.uint(1101));
    });

    it("should fail if the guardianSetId is invalid", () => {
        // Before performing this test, we need to setup the guardian set
        let body = wormhole.buildValidVaaBodySpecs();
        let header = wormhole.buildValidVaaHeader(guardianSet1Keys, body, { version: 1, guardianSetId: 2 });
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of guardianSet1Keys) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        const res = simnet.callReadOnlyFn(
            contractName,
            `parse-and-verify-vaa`,
            [Cl.buffer(vaa)],
            sender
        );
        expect(res.result).toBeErr(Cl.uint(1105));
    });

    it("should fail if one key is being used multiple times", () => {
        // Before performing this test, we need to setup the guardian set
        let body = wormhole.buildValidVaaBodySpecs();
        let header = wormhole.buildValidVaaHeader(guardianSet1Keys, body, { version: 1, guardianSetId: 1 });
        // Override signatures
        for (let i = 0; i < header.signatures.length; i++) {
            header.signatures[i] = header.signatures[0];
        }
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of guardianSet1Keys) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        const res = simnet.callReadOnlyFn(
            contractName,
            `parse-and-verify-vaa`,
            [Cl.buffer(vaa)],
            sender
        );
        expect(res.result).toBeErr(Cl.uint(1102));
    });

    it("should fail if too few signatures are being sent", () => {
        // Before performing this test, we need to setup the guardian set
        let body = wormhole.buildValidVaaBodySpecs();
        let header = wormhole.buildValidVaaHeader(guardianSet1Keys, body, { version: 1, guardianSetId: 1 });
        // Override signatures
        header.signatures = header.signatures.slice(0, 12);
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of guardianSet1Keys) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        const res = simnet.callReadOnlyFn(
            contractName,
            `parse-and-verify-vaa`,
            [Cl.buffer(vaa)],
            sender
        );
        expect(res.result).toBeErr(Cl.uint(1102));
    });

    it("should fail if quorum is not met", () => {
        // Before performing this test, we need to setup the guardian set
        let body = wormhole.buildValidVaaBodySpecs();
        let header = wormhole.buildValidVaaHeader(guardianSet1Keys, body, { version: 1, guardianSetId: 1 });
        // Override signatures
        let cutoff = 12;
        for (let i = cutoff; i < header.signatures.length; i++) {
            header.signatures[i] = header.signatures[0];
        }
        let vaa = wormhole.serializeVaa(header, body);
        let uncompressedPublicKey = [];
        for (let guardian of guardianSet1Keys) {
            uncompressedPublicKey.push(Cl.buffer(guardian.uncompressedPublicKey));
        }
        const res = simnet.callReadOnlyFn(
            contractName,
            `parse-and-verify-vaa`,
            [Cl.buffer(vaa)],
            sender
        );
        expect(res.result).toBeErr(Cl.uint(1102));
    });
})

describe("wormhole-core-v1::update-guardians-set mainnet guardian rotations", () => {
    const accounts = simnet.getAccounts();
    const sender = accounts.get("wallet_1")!;
    let block: ParsedTransactionResult[] | undefined = undefined;

    // Before starting the test suite, we have to setup the guardian set.
    beforeEach(async () => {
        block = wormhole.applyMainnetGuardianSetUpdates(sender, contractName)
    })

    it("should succeed handling the 3 guardians rotations", () => {
        expect(block!).toHaveLength(3);
        block!.forEach((b: ParsedTransactionResult) => {
            expect(b.result).toHaveClarityType(ClarityType.ResponseOk);
        });
    });
});

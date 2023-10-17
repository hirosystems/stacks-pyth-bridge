import { Cl, ClarityType } from "@stacks/transactions";
import { describe, expect } from "vitest";
import { it, fc } from '@fast-check/vitest';
import { wormhole_fc } from './helper';

const contract_name = "wormhole-core-v1";

describe("wormhole-core::v1 - parse-vaa", () => {
    const accounts = simnet.getAccounts();
    const sender = accounts.get("wallet_1")!;

    const keyChain = wormhole_fc.generateGuardianSetKeychain();
    
    const validGuardianRotationVaaPayload = wormhole_fc.buildGuardianRotationVaaPayload(keyChain, 0, 2, 0, 1);

    it.prop(wormhole_fc.vaa({ validSig: false, validData: false }))("fail verify invalid VAA", (version, guardianSetIndex, providedSignatures, generatedSignatures, timestamp, nonce, emitterChain, emitterAddress, sequence, consistencyLevel, payload) => {
        let consolidatedSignatures = [...(providedSignatures as Uint8Array[]), ...(generatedSignatures as Uint8Array[])];        
        let vaa = wormhole_fc.serializeVaa(
            version as number, 
            guardianSetIndex as number, 
            consolidatedSignatures, 
            timestamp as number, 
            nonce as number, 
            emitterChain as number, 
            emitterAddress as Uint8Array, 
            sequence as bigint, 
            consistencyLevel as number, 
            payload as Uint8Array);

        let buff = Cl.buffer(vaa)

        const res = simnet.callReadOnlyFn(
            contract_name,
            `parse-and-verify-vaa`,
            [buff],
            sender
        );
        
        expect(res.result).toHaveClarityType(ClarityType.ResponseErr);
    })

    it.prop(wormhole_fc.vaa({ keyChain, validSig: true, validData: true, payload: validGuardianRotationVaaPayload }))("perform guardian rotation", (version, guardianSetIndex, providedSignatures, generatedSignatures, timestamp, nonce, emitterChain, emitterAddress, sequence, consistencyLevel, payload) => {
        let consolidatedSignatures = [...(providedSignatures as Uint8Array[]), ...(generatedSignatures as Uint8Array[])];        
        let vaa = wormhole_fc.serializeVaa(
            version as number, 
            guardianSetIndex as number, 
            consolidatedSignatures, 
            timestamp as number, 
            nonce as number, 
            emitterChain as number, 
            emitterAddress as Uint8Array, 
            sequence as bigint, 
            consistencyLevel as number, 
            payload as Uint8Array);

        let buff = Cl.buffer(vaa)
        
        const res = simnet.callReadOnlyFn(
            contract_name,
            `parse-vaa`,
            [buff],
            sender
        );
        
        let guardiansPublicKeys = [];
        for (let guardian of keyChain) {
            guardiansPublicKeys.push(Cl.tuple({
                "guardian-id": Cl.uint(guardian.guardianId),
                "recovered-compressed-public-key": Cl.ok(Cl.buffer(guardian.compressedPublicKey))
            }))
        }

        let guardiansSignatures = [];
        for (let i = 0; i < keyChain.length; i++) {
            guardiansSignatures.push(Cl.tuple({
                "guardian-id": Cl.uint(i),
                "signature": Cl.buffer(consolidatedSignatures[i].slice(1, 66))
            }))
        }

        expect(res.result).toBeOk(Cl.tuple({
            "consistency-level": Cl.uint(consistencyLevel as number),
            "emitter-chain": Cl.uint(emitterChain as number),
            "version": Cl.uint(version as number),
            "guardian-set-id": Cl.uint(guardianSetIndex as number),
            "signatures-len": Cl.uint(consolidatedSignatures.length),
            "sequence": Cl.uint(sequence as number),
            "guardians-public-keys": Cl.list(guardiansPublicKeys),
            "signatures": Cl.list(guardiansSignatures),
            "payload": Cl.buffer(payload as Uint8Array)
        }));


        // console.log(payload)
    
    })
})

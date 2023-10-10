import { Cl } from "@stacks/transactions";
import { describe, expect } from "vitest";
// import { tx } from "@hirosystems/clarinet-sdk";
import { it, fc } from '@fast-check/vitest';
import { concatTypedArrays, uint8toBytes, uint16toBytes, uint32toBytes, bigintToBuffer } from './helper';

const cursor_contract_name = "hk-cursor-v1";

describe("hiro-kit::cursor - buffers", () => {
    const accounts = simnet.getAccounts();
    const sender = accounts.get("wallet_1")!;
    
    const buff_n = (n: number) => {
        return fc.uint8Array({ minLength: 0, maxLength: n })
    }
    
    it.prop([buff_n(8192)])("read-buff-1", (numbers) => {
        var data = new Uint8Array();
        for (let n of numbers) {
            data = concatTypedArrays(data, uint8toBytes(n));
        }
        let nextInput = Cl.tuple({
            bytes: Cl.buffer(data),
            pos: Cl.uint(0)
        })

        let pos = 0;
        for (let n of numbers) {
            pos += 1;
            let res = simnet.callReadOnlyFn(
                cursor_contract_name,
                "read-buff-1",
                [nextInput],
                sender
            );
            nextInput = Cl.tuple({
                bytes: Cl.buffer(data),
                pos: Cl.uint(pos)
            });
            expect(res.result).toBeOk(Cl.tuple({
                value: Cl.buffer(uint8toBytes(n)),
                next: nextInput
            }))
        }
    })

    it.prop([fc.uniqueArray(fc.constantFrom(1, 2, 4, 8, 16, 20, 64, 65))])("read-buff-n", (buffer) => {
        var data = new Uint8Array();
        let segments = [];
        for (let value of buffer) {
            var segment = new Uint8Array();
            for (let i = 0; i < value; i++) {
                segment = concatTypedArrays(segment, uint8toBytes(value));
            }
            segments.push(segment);
            data = concatTypedArrays(data, segment);
        }

        let nextInput = Cl.tuple({
            bytes: Cl.buffer(data),
            pos: Cl.uint(0)
        })

        let pos = 0;
        for (let segment of segments) {
            let len = segment.length;
            pos += len;
            let res = simnet.callReadOnlyFn(
                cursor_contract_name,
                `read-buff-${len}`,
                [nextInput],
                sender
            );
            nextInput = Cl.tuple({
                bytes: Cl.buffer(data),
                pos: Cl.uint(pos)
            });
            expect(res.result).toBeOk(Cl.tuple({
                value: Cl.buffer(segment),
                next: nextInput
            }))
        }
    })
})

describe("hiro-kit::cursor - unsigned integers", () => {
    const accounts = simnet.getAccounts();
    const sender = accounts.get("wallet_1")!;
   
    let arrayOfUint8 = fc.uint8Array({ minLength: 0, maxLength: 8192 });
    it.prop([arrayOfUint8])("read-uint-8", (numbers) => {
        var data = new Uint8Array();
        for (let n of numbers) {
            data = concatTypedArrays(data, uint8toBytes(n));
        }
        let nextInput = Cl.tuple({
            bytes: Cl.buffer(data),
            pos: Cl.uint(0)
        })

        let pos = 0;
        for (let n of numbers) {
            pos += 1;
            let res = simnet.callReadOnlyFn(
                cursor_contract_name,
                "read-uint-8",
                [nextInput],
                sender
            );
            nextInput = Cl.tuple({
                bytes: Cl.buffer(data),
                pos: Cl.uint(pos)
            });
            expect(res.result).toBeOk(Cl.tuple({
                value: Cl.uint(n),
                next: nextInput
            }))
        }
    })

    let arrayOfUint16 = fc.uint16Array({ minLength: 0, maxLength: 4196 });
    it.prop([arrayOfUint16])("read-uint-16", (numbers) => {
        var data = new Uint8Array();
        for (let n of numbers) {
            data = concatTypedArrays(data, uint16toBytes(n));
        }
        let nextInput = Cl.tuple({
            bytes: Cl.buffer(data),
            pos: Cl.uint(0)
        })

        let pos = 0;
        for (let n of numbers) {
            pos += 2;
            let res = simnet.callReadOnlyFn(
                cursor_contract_name,
                "read-uint-16",
                [nextInput],
                sender
            );
            nextInput = Cl.tuple({
                bytes: Cl.buffer(data),
                pos: Cl.uint(pos)
            });
            expect(res.result).toBeOk(Cl.tuple({
                value: Cl.uint(n),
                next: nextInput
            }))
        }
    })

    let arrayOfUint32 = fc.uint32Array({ minLength: 0, maxLength: 2048 });
    it.prop([arrayOfUint32])("read-uint-32", (numbers) => {
        var data = new Uint8Array();

        for (let n of numbers) {
            data = concatTypedArrays(data, uint32toBytes(n));
        }
        let nextInput = Cl.tuple({
            bytes: Cl.buffer(data),
            pos: Cl.uint(0)
        })

        let pos = 0;
        for (let n of numbers) {
            pos += 4;
            let res = simnet.callReadOnlyFn(
                cursor_contract_name,
                "read-uint-32",
                [nextInput],
                sender
            );
            nextInput = Cl.tuple({
                bytes: Cl.buffer(data),
                pos: Cl.uint(pos)
            });
            expect(res.result).toBeOk(Cl.tuple({
                value: Cl.uint(n),
                next: nextInput
            }))
        }
    })

    let arrayOfUint64 = fc.array(fc.bigUintN(64), { minLength: 0, maxLength: 1024 });
    it.prop([arrayOfUint64])("read-uint-64", (numbers) => {
        var data = Buffer.from([]);
        for (let n of numbers) {
            data =  Buffer.concat([data, Buffer.from(bigintToBuffer(n, 8))]);
        }
        let nextInput = Cl.tuple({
            bytes: Cl.buffer(data),
            pos: Cl.uint(0)
        })

        let pos = 0;
        for (let n of numbers) {
            pos += 8;
            let res = simnet.callReadOnlyFn(
                cursor_contract_name,
                "read-uint-64",
                [nextInput],
                sender
            );
            nextInput = Cl.tuple({
                bytes: Cl.buffer(data),
                pos: Cl.uint(pos)
            });
            expect(res.result).toBeOk(Cl.tuple({
                value: Cl.uint(n),
                next: nextInput
            }))
        }
    })

    let arrayOfUint128 = fc.array(fc.bigUintN(128), { minLength: 0, maxLength: 512 });
    it.prop([arrayOfUint128])("read-uint-128", (numbers) => {
        var data = Buffer.from([]);
        for (let n of numbers) {
            data =  Buffer.concat([data, Buffer.from(bigintToBuffer(n, 16))]);
        }
        let nextInput = Cl.tuple({
            bytes: Cl.buffer(data),
            pos: Cl.uint(0)
        })

        let pos = 0;
        for (let n of numbers) {
            pos += 16;
            let res = simnet.callReadOnlyFn(
                cursor_contract_name,
                "read-uint-128",
                [nextInput],
                sender
            );
            nextInput = Cl.tuple({
                bytes: Cl.buffer(data),
                pos: Cl.uint(pos)
            });
            expect(res.result).toBeOk(Cl.tuple({
                value: Cl.uint(n),
                next: nextInput
            }))
        }
    })
})

describe("hiro-kit::cursor - signed integers", () => {
    const accounts = simnet.getAccounts();
    const sender = accounts.get("wallet_1")!;
    
    let arrayOfInt8 = fc.array(fc.bigIntN(8), { minLength: 0, maxLength: 1023 });
    it.prop([arrayOfInt8])("read-int-8", (numbers) => {
        var data = Buffer.from([]);
        for (let n of numbers) {
            data =  Buffer.concat([data, Buffer.from(bigintToBuffer(n, 1))]);
        }
        let nextInput = Cl.tuple({
            bytes: Cl.buffer(data),
            pos: Cl.uint(0)
        })

        let pos = 0;
        for (let n of numbers) {
            pos += 1;
            let res = simnet.callReadOnlyFn(
                cursor_contract_name,
                "read-int-8",
                [nextInput],
                sender
            );
            nextInput = Cl.tuple({
                bytes: Cl.buffer(data),
                pos: Cl.uint(pos)
            });
            expect(res.result).toBeOk(Cl.tuple({
                value: Cl.int(n),
                next: nextInput
            }))
        }
    })

    let arrayOfInt16 = fc.array(fc.bigIntN(16), { minLength: 0, maxLength: 1023 });
    it.prop([arrayOfInt16])("read-int-16", (numbers) => {
        var data = Buffer.from([]);
        for (let n of numbers) {
            data =  Buffer.concat([data, Buffer.from(bigintToBuffer(n, 2))]);
        }
        let nextInput = Cl.tuple({
            bytes: Cl.buffer(data),
            pos: Cl.uint(0)
        })

        let pos = 0;
        for (let n of numbers) {
            pos += 2;
            let res = simnet.callReadOnlyFn(
                cursor_contract_name,
                "read-int-16",
                [nextInput],
                sender
            );
            nextInput = Cl.tuple({
                bytes: Cl.buffer(data),
                pos: Cl.uint(pos)
            });
            expect(res.result).toBeOk(Cl.tuple({
                value: Cl.int(n),
                next: nextInput
            }))
        }
    })

    let arrayOfInt32 = fc.array(fc.bigIntN(32), { minLength: 0, maxLength: 1023 });
    it.prop([arrayOfInt32])("read-int-32", (numbers) => {
        var data = Buffer.from([]);
        for (let n of numbers) {
            data =  Buffer.concat([data, Buffer.from(bigintToBuffer(n, 4))]);
        }
        let nextInput = Cl.tuple({
            bytes: Cl.buffer(data),
            pos: Cl.uint(0)
        })

        let pos = 0;
        for (let n of numbers) {
            pos += 4;
            let res = simnet.callReadOnlyFn(
                cursor_contract_name,
                "read-int-32",
                [nextInput],
                sender
            );
            nextInput = Cl.tuple({
                bytes: Cl.buffer(data),
                pos: Cl.uint(pos)
            });
            expect(res.result).toBeOk(Cl.tuple({
                value: Cl.int(n),
                next: nextInput
            }))
        }
    })

    let arrayOfInt64 = fc.array(fc.bigIntN(64), { minLength: 0, maxLength: 1023 });
    it.prop([arrayOfInt64])("read-int-64", (numbers) => {
        var data = Buffer.from([]);
        for (let n of numbers) {
            data =  Buffer.concat([data, Buffer.from(bigintToBuffer(n, 8))]);
        }
        let nextInput = Cl.tuple({
            bytes: Cl.buffer(data),
            pos: Cl.uint(0)
        })

        let pos = 0;
        for (let n of numbers) {
            pos += 8;
            let res = simnet.callReadOnlyFn(
                cursor_contract_name,
                "read-int-64",
                [nextInput],
                sender
            );
            nextInput = Cl.tuple({
                bytes: Cl.buffer(data),
                pos: Cl.uint(pos)
            });
            expect(res.result).toBeOk(Cl.tuple({
                value: Cl.int(n),
                next: nextInput
            }))
        }
    })

    let arrayOfInt128 = fc.array(fc.bigIntN(128), { minLength: 0, maxLength: 1023 });
    it.prop([arrayOfInt128])("read-int-128", (numbers) => {
        var data = Buffer.from([]);
        for (let n of numbers) {
            data =  Buffer.concat([data, Buffer.from(bigintToBuffer(n, 16))]);
        }
        let nextInput = Cl.tuple({
            bytes: Cl.buffer(data),
            pos: Cl.uint(0)
        })

        let pos = 0;
        for (let n of numbers) {
            pos += 16;
            let res = simnet.callReadOnlyFn(
                cursor_contract_name,
                "read-int-128",
                [nextInput],
                sender
            );
            nextInput = Cl.tuple({
                bytes: Cl.buffer(data),
                pos: Cl.uint(pos)
            });
            expect(res.result).toBeOk(Cl.tuple({
                value: Cl.int(n),
                next: nextInput
            }))
        }
    })
})

// @ts-check

import fs from "node:fs";
import path from "node:path";
import initVM from "obscurity-sdk";

let deployer;
let sender;

/**
 *
 * @param {string} name
 * @param {(vm: import("obscurity-sdk").ClarityVM) => any} fn
 */
export async function clarinetTest(name, fn) {
  const vm = await initVM();
  await vm.initSession(process.cwd(), "./Clarinet.toml");

  const accounts = vm.getAccounts();
  deployer = accounts.get("deployer");
  sender = accounts.get("wallet_1");

  fn(vm);

  const lcov = vm.terminate();
  fs.appendFileSync(path.join(process.cwd(), "lcov.info"), lcov);
}

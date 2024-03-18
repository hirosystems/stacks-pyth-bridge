import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const authority = accounts.get("authority")!;
const address2 = accounts.get("wallet_2")!;

/*
  The test below is an example. Learn more in the clarinet-sdk readme:
  https://github.com/hirosystems/clarinet/blob/develop/components/clarinet-sdk/README.md
*/

describe("Token can be minted and burnt", () => {
  it("ensures authority mint tokens", () => {
    const { result, events } = simnet.callPublicFn(
      "cbtc-token",
      "mint",
      [Cl.uint(1000), Cl.principal(address2)],
      authority,
    );

    expect(result).toBeOk(Cl.bool(true));

    expect(events).toContainEqual({
      event: "ft_mint_event",
      data: {
        amount: "1000",
        asset_identifier: `${simnet.deployer}.cbtc-token::cbtc`,
        recipient: address2,
      },
    });
  });

  it("ensures that token can be burnt", () => {
    simnet.callPublicFn(
      "cbtc-token",
      "mint",
      [Cl.uint(1000), Cl.principal(address2)],
      authority,
    );

    const { result, events } = simnet.callPublicFn(
      "cbtc-token",
      "burn",
      [Cl.uint(500)],
      address2,
    );

    expect(result).toBeOk(Cl.bool(true));

    expect(events).toContainEqual({
      event: "ft_burn_event",
      data: {
        amount: "500",
        asset_identifier: `${simnet.deployer}.cbtc-token::cbtc`,
        sender: address2,
      },
    });
  });
});

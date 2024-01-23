       /     /   ▶ Stacks Pyth Bridge
      / --- /      Bridging Pyth price feeds to the Stacks blockchain.
     /     /       Retrieve trading pairs (BTC-USD, STX-USD, etc.) from Clarity smart contracts.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[![Introduction](https://img.shields.io/badge/%23-%20Introduction%20-orange?labelColor=gray)](#Introduction)
&nbsp;&nbsp;&nbsp;&nbsp;[![Features](https://img.shields.io/badge/%23-Features-orange?labelColor=gray)](#Features)
&nbsp;&nbsp;&nbsp;&nbsp;[![Getting started](https://img.shields.io/badge/%23-Quick%20Start-orange?labelColor=gray)](#Quick-start)
&nbsp;&nbsp;&nbsp;&nbsp;[![Documentation](https://img.shields.io/badge/%23-Documentation-orange?labelColor=gray)](#Documentation)
&nbsp;&nbsp;&nbsp;&nbsp;[![Contribute](https://img.shields.io/badge/%23-Contribute-orange?labelColor=gray)](#Contribute)

---

# Introduction

**Status**: **Beta**

The Pyth protocol integration is available as a Beta on both testnet and mainnet networks, to help developers test, give feedback, and ensure the reliability and stability of the integration.

[Stacks](http://stacks.co) is a blockchain linked to Bitcoin by its consensus mechanism that spans the two chains, called Proof of Transfer. This enables Stacks to leverage Bitcoin’s security and enables Stacks apps to use Bitcoin’s state.
Stacks is a Bitcoin layer that enables decentralized apps and smart contracts.

[Pyth Network](https://pyth.network) is an oracle that publishes financial market data to multiple blockchains. The market data is contributed by over 80 first-party publishers, including some of the biggest exchanges and market-making firms in the world. Pyth offers price feeds for several asset classes, including US equities, commodities, and cryptocurrencies. Each price feed publishes a robust aggregate of publisher prices that updates multiple times per second.
Price feeds are available on multiple blockchains and can be used in off-chain applications.

[Wormhole](https://wormhole.com) is a decentralized attestation engine that leverages its network of guardians to trustlessly bridge information between the chains it supports. Wormhole has a simple, elegant, and pragmatic design that has enabled it to be the first real solution to ship to market and has received wide recognition and support from its member chains.

## Setup and and run the tests

The contracts are developed in Clarity and use [clarinet-sdk](https://www.npmjs.com/package/@hirosystems/clarinet-sdk) for its test harnessing.

Git clone and compile **stacks-pyth-relayer**

```bash
$ git clone https://github.com/hirosystems/stacks-pyth-bridge.git
$ cd stacks-pyth-bridge
$ npm install
$ npm test
```

## Consuming price feeds

### Latest Deployments

| network | address                                                                                                                                                                    |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| testnet | [ST2T5JKWWP3FYYX4YRK8GK5BG2YCNGEAEY1JKX06E.pyth-oracle-v2](https://explorer.hiro.so/txid/0x59dc127b983fcb8027706191b62138eb73a3ade8ecdbad5e99df4d2bfbbd6dfb?chain=testnet) |
| mainnet | [SP2T5JKWWP3FYYX4YRK8GK5BG2YCNGEAEY2P2PKN0.pyth-oracle-v2](https://explorer.hiro.so/txid/0xee803f98e61c1d46d36d130c29d4a78099c8fb5700528226f3dc5a104954ffeb?chain=mainnet) |

### Onchain

The `pyth-oracle-v2` contract is exposing the following method:

```clarity
(define-public (read-price-feed
    (price-feed-id (buff 32))
    (pyth-storage-address <pyth-storage-trait>)))
```

That can be consumed with the following invocation:

```clarity
(contract-call?
    'SP2T5JKWWP3FYYX4YRK8GK5BG2YCNGEAEY2P2PKN0.pyth-oracle-v2                ;; Address of the helper contract
    read-price-feed
    0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43      ;; BTC-USD price identifier
    'SP2T5JKWWP3FYYX4YRK8GK5BG2YCNGEAEY2P2PKN0.pyth-store-v1)
```

The authenticity of the price feeds is verified during their ingestion, making the cost of queries as light as possible.

Each Pyth Network price feed is referred to via a unique ID. Price feeds also have different IDs in mainnets than testnets or devnets. The full list of price feeds is listed on the [pyth.network website](https://pyth.network/price-feeds/). The price feed IDs page lists the ID of each available price feed on every chain where they are available. To use a price feed on-chain, look up its ID using these pages, then store the feed ID in your program for price feed queries.

Price Feed usage and best practices are described on the [pyth.network developer documentation website](https://docs.pyth.network/documentation/pythnet-price-feeds/best-practices).

#### Prices currently supported on Testnet and Mainnet

The full list of prices is available [here](https://pyth.network/price-feeds/).

### Offchain

For every new price recorded and stored on chain, the `pyth-store-v1` is emitting an event with the following shape:

```clarity
{
  type: "price-feed",
  action: "updated",
  data: {
    price-identifier: 0xec7a775f46379b5e943c3526b1c8d54cd49749176b0b98e02dde68d1bd335c17,
    price: 46098556,
    conf: u37359,
    ema-price: 46167004,
    ema-conf: u36191,
    expo: -8,
    publish-time: u1695751649,
    prev-publish-time: u1695751648
  }
}
```

These events can be observed using [Chainhook](https://github.com/hirosystems/chainhook), using the `print` predicates.

## Updating price feeds

Pyth Network uses [a pull price update model](https://docs.pyth.network/documentation/pythnet-price-feeds/on-demand) that is slightly different from other oracles you may be more familiar with. Most oracles today use a push model, where the oracle runs an off-chain process that continuously sends transactions to update an on-chain price. In contrast, Pyth Network does not operate an off-chain process that pushes prices on-chain. Instead, it delegates this work to Pyth Network users.

[Hermes](https://docs.pyth.network/documentation/pythnet-price-feeds/hermes) is a web service that listens to the Pythnet and the Wormhole Network for Pyth price updates, and serves them via a convenient web API. It provides Pyth's latest price update data format that are more cost-effective to verify and use on-chain.
Hermes allows users to easily query for recent price updates via a REST API, or subscribe to a websocket for streaming updates. The Pyth Network's Javascript SDKs connect to an instance of Hermes to fetch price updates.

```console
$ curl https://hermes.pyth.network/api/latest_price_feeds?ids[]=ec7a775f46379b5e943c3526b1c8d54cd49749176b0b98e02dde68d1bd335c17&binary=true \
| jq -r '.[0]'.vaa \
| base64 --decode \
| hexdump -ve '1/1 "%.2x"'

504e41550100000003b8...a7b10321ad7c2404a910
```

This sequence of bytes is a Verified Action Approvals (VAA) including the price informations including its cryptographic elements helping the Pyth contract ensuring the authenticity of the data.

This VAA can be encoded as a Clarity buffer, and submitted to the Pyth contract using the following:

```clarity
(contract-call?
    'SP2T5JKWWP3FYYX4YRK8GK5BG2YCNGEAEY2P2PKN0.pyth-oracle-v2   ;; Address of the helper contract
    verify-and-update-price
    0x504e41550100000003b8...a7b10321ad7c2404a910               ;; BTC-USD price update
    {
      pyth-storage-contract: 'SP2T5JKWWP3FYYX4YRK8GK5BG2YCNGEAEY2P2PKN0.pyth-store-v1,
      pyth-decoder-contract: 'SP2T5JKWWP3FYYX4YRK8GK5BG2YCNGEAEY2P2PKN0.pyth-pnau-decoder-v1,
      wormhole-core-contract: 'SP2T5JKWWP3FYYX4YRK8GK5BG2YCNGEAEY2P2PKN0.wormhole-core-v2
    })
```

If the VAA is valid, the contract call will return a payload with the following signature:

```clarity
(response
  (list 64 {
    price-identifier: (buff 32),
    price: int,
    conf: uint,
    expo: int,
    ema-price: int,
    ema-conf: uint,
    publish-time: uint,
    prev-publish-time: uint,
  })
  uint)
```

Including all the prices successfully updating the oracle.
All of the implementation details can be found in [Pyth documentation](https://docs.pyth.network/documentation/how-pyth-works).

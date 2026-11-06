# Kizashi

**Outcome markets that net your collateral.** Bet yes/no, or bet the _shape_ of an outcome (the ETH
year-end close, total goals on Boxing Day, a bowler's top speed). Kizashi compiles every bet into a
payout vector, prices all of them on one LMSR curve, and locks USDC only for the **worst case of the
sum** of your positions, not the sum of each bet's worst case.

Built at ETHGlobal Mumbai 2026 on **Arc** (money), **Uniswap v4** (prices) and **Arkiv** (public
records).

---

## Why

- **Outcome markets waste capital.** Every bet is collateralised on its own, even when your bets
  partly cancel. Money that covers no real risk sits idle.
- **Yes/no throws information away.** People believe distributions, not thresholds, and a stack
  of threshold markets fragments liquidity.
- **Nobody checks whether a new bet hedges what you already hold.** Kizashi does, on chain.

## How it works

### One curve, every bet shape

A market splits a real-world number into `n` buckets on a grid (`lo`, width `w`). A bet is a vector
`δ ∈ ℝⁿ` of shares per bucket: a yes/no bet is a step, a curve bet is a discretised bell, a range bet
is a box. All of them trade against one LMSR maker:

```
C(q) = M + b · ln Σᵢ exp((qᵢ − M) / b),   M = max q,   b from the creator's USDC subsidy
charge(δ) = C⁺(q + δ) − C⁻(q)             (directed rounding: the pool never under-collects)
```

### Netting (the core)

Your position is the **sum** of your vectors, `v = Σ δ`. It needs collateral `K(v) = max(0, −min v)`.
Since `min(a + b) ≥ min a + min b`, backing the sum never costs more than backing each bet, and
usually costs much less. The portfolio shows **Gross** (each ticket backed alone), **Netted** (the
worst case of the sum) and **Freed** (the difference).

Invariants, tested in `contracts/test/core` (125 tests including fuzz and invariant suites):

|     | Invariant                                                                        |
| --- | -------------------------------------------------------------------------------- |
| I1  | Solvency: pool cash ≥ the worst-case liability over every bucket                 |
| I2  | Positions stay non-negative after top-up and normalisation                       |
| I3  | Maker loss ≤ b · ln n                                                            |
| I4  | Path additivity: trading δ₁ then δ₂ costs the same as δ₁ + δ₂                    |
| I5  | Exact translation: adding a constant to every bucket costs exactly that constant |
| I6  | Freed collateral ≥ 0                                                             |

`@kizashi/core` is a bigint TypeScript mirror with **exact parity** with the Solidity (665 tests
against 381 golden vectors from a Python reference in `contracts/ref`), so the UI and the engine
quote exactly what the chain charges.

**Curve ↔ binary bridge.** Any curve market reads as a yes/no at any threshold
(`packages/core/src/modes.ts`). Both bet types share one book and one pool of liquidity.

**Why anyone draws a curve.** The incentive falls out of netting. A curve bet that offsets what
you hold frees collateral, so it costs less margin than the binary bets it replaces, and a sharp,
correct curve pays more than the matching binary bet.

### Creating a market

`/markets/new` takes:

- a question, description, category, tags and an image;
- YES/NO labels or a numeric range;
- an expiry;
- the resolution criteria, edge cases, and a source with a link;
- the method: a resolver with a 30-minute dispute window, or Uniswap v4 TWAP;
- the initial USDC liquidity.

1. The image and the metadata JSON are pinned to IPFS (Pinata, server-side).
2. The market's on-chain `rulesRef` is **keccak256 of the canonical metadata JSON**, so the chain
   commits to the exact question and rules.
3. `createMarket` on Arc moves the USDC subsidy into a fresh pool.
4. The listing service re-reads the market from Arc, re-hashes the IPFS document against
   `rulesRef`, and only then publishes the Arkiv listing.
5. The market page shows **"Rules match the on-chain hash"**, with links.

### The engine (Suggest mode)

`apps/engine` is a LangGraph pipeline behind an Express API:

1. Rule set (JSON or PDF) → confirmed `rulesHash`.
2. Market context read from Arc at one pinned block.
3. Gemini plans a bet (structured output, validated by zod).
4. The plan compiles to an exact payout vector with `@kizashi/core`.
5. Deterministic risk checks: per-trade, daily and market caps, budget, closed markets, and quote
   drift against an on-chain `quote()` at the same block.
6. The approval goes out as an Arkiv `proposal`. **You sign the trade**; the engine verifies the
   receipt and marks the proposal approved.

The LLM never touches funds or makes the risk decision.

## Partners

### Arc: where the money lives

- All collateral, charges and payouts are **USDC** (the ERC-20 at `0x3600…0000`, 6 decimals) on Arc
  testnet (chain `5042002`). Gas is USDC too.
- **Arc Studio:** the engine's budget vault was audited, tested and deployed through Arc Studio
  (app `30bf0d08-8944-4747-8ef9-dfcd4bd2520b`).
  - Its implementation `0xA631C3fF4128b9dA8581e636db88f7927A3df9cb` is what
    `EngineVaultFactory` clones.
  - The Studio audit's findings are disclosed under [Known issues](#known-issues).
- One-command deploy: `contracts/script/deploy-arc.sh` (chain checks, dry run, broadcast, verify,
  liquidity seed, demo markets).

### Uniswap v4: settlement from on-chain prices

Uniswap has no official v4 deployment on Arc, so we deploy our own `PoolManager` and a KZT/USDC pool
with **`KizashiOracleHook`**:

- [`contracts/src/hooks/KizashiOracleHook.sol`](contracts/src/hooks/KizashiOracleHook.sol): an
  OpenZeppelin `BaseHook` using `afterInitialize` and `afterSwap`. It records a tick reading into a
  720-slot ring buffer on every swap, and `consult(poolId, from, to)` returns the mean tick and the
  number of readings in a window. The address is mined with `HookMiner` to carry the right flag
  bits.
- [`contracts/src/resolution/KizashiResolver.sol`](contracts/src/resolution/KizashiResolver.sol):
  `resolveFromTwap(marketId)`.
  - It consults the window ending at close and requires `minObservations` readings and
    `minLiquidity`.
  - It maps the mean tick to a grid value (decimals read from the tokens themselves), then to a
    bucket.
  - If the window can't be read or the guards fail, it falls back to manual resolution instead of
    getting stuck.
- [`contracts/src/market/KizashiMarketFactory.sol`](contracts/src/market/KizashiMarketFactory.sol):
  validates the `PriceSource` (the hook address, window, guards and token decimals) at creation.

### Arkiv: public discovery and history

`packages/arkiv` (`@arkiv-network/sdk` 1.0.1) defines four entity types. Every one is tagged
`project=kizashi` and `v=1`; details are in [`arkiv/schema.md`](arkiv/schema.md).

| Entity                  | Writer                                                       | What users see                                                                 |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `kizashi.market`        | listing service `0xeE5F49601ce76294c09FA38a6c85a10f25990ed3` | The lobby, with the metadata and image CIDs, and the creator recorded          |
| `kizashi.curveSnapshot` | indexer `0x685317A2bFdABFbe1d4b05c334ff5272137Ef134`         | The crowd-curve history chart                                                  |
| `kizashi.proposal`      | engine `0x2888347C7D47E450bB7fE4193B98dB728a948FB9`          | The engine inbox (10-minute expiry, then patched to approved with the tx hash) |
| `kizashi.probe`         | smoke test                                                   | Testnet write/read evidence                                                    |

The access key stays on the server: browsers read through a read-only JSON-RPC proxy at
`/api/arkiv` that refuses anything that writes. Arkiv never holds or authorises money; on any
conflict, Arc wins.

A runnable query (the lobby):

```ts
import { createArkivReader, openMarkets } from "@kizashi/arkiv";
const reader = createArkivReader({ rpcUrl: process.env.ARKIV_RPC_URL! });
const { items } = await openMarkets(reader, {
  owner: "0xeE5F49601ce76294c09FA38a6c85a10f25990ed3",
  arcChainId: 5042002,
});
// where project="kizashi" && v=1 && status="open" && resolvesAt > now   order by resolvesAt asc
```

## Deployed contracts (Arc testnet, chain 5042002)

| Contract                                           | Address                                      |
| -------------------------------------------------- | -------------------------------------------- |
| KizashiMarketFactory                               | `0x9220ff4A3E8239E05592c8DD6203DF3eD277C756` |
| KizashiResolver                                    | `0xf8E601C93Fd1d98833E24d578410FDaaA69A5A70` |
| KizashiPool (implementation)                       | `0x494202DCD3094B576C9B34B0bB74be97E333CEab` |
| KizashiOracleHook                                  | `0xDC01d60Ac4a389FD3Cf84959A8fc1e7EDcACd040` |
| PoolManager (Uniswap v4)                           | `0xAAa363AB15694eFA8ce0E5D7462F1A6123389F11` |
| KZT test token                                     | `0x293D9e82fe0f3bDe07164D0EDfAE19eCd33E09dc` |
| EngineVaultFactory                                 | `0xdF9c01CFb5D448043C6fC54FA365c9645D443104` |
| EngineBudgetVault (implementation, via Arc Studio) | `0xA631C3fF4128b9dA8581e636db88f7927A3df9cb` |

The full record, including every market, is in
[`contracts/deployments/5042002.json`](contracts/deployments/5042002.json). Explorer:
https://explorer.testnet.arc.io

## On-chain evidence

Everything below happened on Arc testnet (5042002) or Arkiv Rabdi (7794095) and is linked to its
explorer. Nothing is mocked.

### Uniswap v4 TWAP settlement

- Market #2 (curve market resolved from the KZT/USDC v4 pool TWAP): settled by
  [`resolveFromTwap(2)`](https://explorer.testnet.arc.io/tx/0x7bcb093b18df6885db0068ff8c2885983195e57d9ec2bb01ee66b90d69c85b00),
  `Finalized(2, bucket 2, mode TWAP)`.
- Market #7 (seeded KZT/USDC close at 00:50 IST, 7 Nov): [`resolveFromTwap(7)`](https://explorer.testnet.arc.io/tx/0x2cb5f5b2309e0d547a54e1ab6cc593c1a16960e0031bc77653483ad3fbbc29eb)
  emitted `TwapRejected(7, observations=8, ...)`, not a TWAP finalization. Rate limits on the
  public Arc RPC cut the swap run short, so the window held fewer than the required readings and
  the contract refused the TWAP and fell back to the manual path, as designed.

### Seeded markets (image and rules on IPFS, listing on Arkiv)

| #   | Market                                                                     | createMarket tx                                                                                                        | Metadata (IPFS)   | Arkiv listing                                                                                                                   |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 5   | Will ETH close above $5,000 on 31 December 2026?                           | [`0x965d29b6…`](https://explorer.testnet.arc.io/tx/0x965d29b67c3cabbdd3431f0dffa8fcc1a16afee94367fc670eb18bdc0aca580f) | `bafkreievhzzuq…` | [`0x0d0d4e8c…`](https://rabdi.explorer.arkiv.network/entity/0x0d0d4e8c1f8f4c003924a832dcce11fb65ce088a615648dcc32291a3c0820cf9) |
| 6   | What will BTC trade at on 31 December 2026?                                | [`0x740e769a…`](https://explorer.testnet.arc.io/tx/0x740e769aac28bf81f32b64851ef8a85a28f8da2614969c44659e5d4044d2fc55) | `bafkreigmk6ckc…` | [`0xc4d53e7d…`](https://rabdi.explorer.arkiv.network/entity/0xc4d53e7d65b1526f681b603a0af1ad8268fe8567267360262b63e50eba3c46ca) |
| 7   | Where will KZT/USDC settle at the 00:50 IST close on 7 November?           | [`0x7121e36c…`](https://explorer.testnet.arc.io/tx/0x7121e36c4a83c93c485e34bb9144f1878883f9221d875b37c8d68a90e6ccac3c) | `bafkreibrpakn7…` | [`0x35b5c830…`](https://rabdi.explorer.arkiv.network/entity/0x35b5c830de0a754fa0030399ec51788a1c7257f626ebcd5bb2d000139cf0eecd) |
| 8   | Will Arsenal be top of the Premier League on 1 January 2027?               | [`0xb909fb49…`](https://explorer.testnet.arc.io/tx/0xb909fb49f0000065277a76ba8e8749ac0373156708a58ffb1ae2ce14011675d0) | `bafkreibnsrjav…` | [`0x5b860619…`](https://rabdi.explorer.arkiv.network/entity/0x5b8606194841d64723c251c7b5470415d84e40929a3c452e832332f0b79564a9) |
| 9   | How many goals will be scored in the Premier League on Boxing Day 2026?    | [`0x3c92885b…`](https://explorer.testnet.arc.io/tx/0x3c92885b98b9be60b44d59586638daa71d031e37cbcf42cb0fb338f408647e86) | `bafkreifgut5gp…` | [`0x841ec992…`](https://rabdi.explorer.arkiv.network/entity/0x841ec992c80e5eb57d91db8d83e80069576a3d6622ff83c5c986446703fc11ca) |
| 10  | Fastest delivery in men's international cricket in December 2026?          | [`0x8fc708c4…`](https://explorer.testnet.arc.io/tx/0x8fc708c416ef5e0c00022189b19cfd6ce0929d4543c3a6f9f8b3ab41d83555af) | `bafkreihzyxllz…` | [`0x2eaebbfa…`](https://rabdi.explorer.arkiv.network/entity/0x2eaebbfa72148096b8d9d23c4befe35a188d326ced413c58110fe752a1953de3) |
| 11  | Will anyone score a double century in men's Test cricket in December 2026? | [`0x3a821e09…`](https://explorer.testnet.arc.io/tx/0x3a821e09f47eedaa7b5354177e6d1ab72538abdb5935f21bbdb7b171ec86e30d) | `bafkreihhwall7…` | [`0x7f9a94d3…`](https://rabdi.explorer.arkiv.network/entity/0x7f9a94d35983cea9f069478db796b38b29a422b9b190dc80279c14aa27fb2fdb) |
| 12  | Will more than 400 projects be submitted at ETHGlobal Mumbai?              | [`0xb1866c97…`](https://explorer.testnet.arc.io/tx/0xb1866c9751b8f9d678f6e5e097685cf7b4274319b9150153e444b214e0faf55c) | `bafkreialurs2i…` | [`0x98319ac2…`](https://rabdi.explorer.arkiv.network/entity/0x98319ac2bbd56bd00a22358e6f0e80e0d20390222a9086d77726feea53659bd4) |

### Arkiv

- Smoke write: [entity](https://rabdi.explorer.arkiv.network/entity/0x904eeceb4608a6202e16357b263c9a8c98ec6faf75ef556611b7997445fa5c3f),
  [tx](https://rabdi.explorer.arkiv.network/tx/0xc43adbc4a7bf7412bfb3ed29f97cf106a28f82af5ea12b9d055b2563078ec141).
- Curve snapshot, market 9 (second point after the engine trade): [entity](https://rabdi.explorer.arkiv.network/entity/0xe37b073f5aead48ba27fd467566e62df5fa1b4254a40def1caaaea7b04977520).
- Engine proposal, market 9: [entity](https://rabdi.explorer.arkiv.network/entity/0x65acb548100dac8517ad535484c545165aa54458b6373279374a6d50d4eb9858), patched to `approved` with the trade hash.

### Netting, on chain

On market 9 one wallet sold a narrow curve around 24 goals, then bought a wider curve. Gross
requirement 0.50 USDC, netted 0.25 USDC, freed 0.25 USDC; the pool's `floorOf` reads the same
0.25, and the position replay matches exactly.
Txs: [sell](https://explorer.testnet.arc.io/tx/0x8a70cd717c7dd0ecc01c15bdfc21d0662573056a607dbab3a89e1a630d2ccd3b),
[hedge](https://explorer.testnet.arc.io/tx/0x6255c79611542dfdcce2cb3f09f2c428a818890d259ef4bea6d0b740af0fe2c1),
[release of the freed 0.25](https://explorer.testnet.arc.io/tx/0xfd8299cc8f49b5dc699c6607c6d51a13b74a6c1b016d4aef6cd5ebc85f8a851c).
Other trades: football curve [`0xbe95…`](https://explorer.testnet.arc.io/tx/0xbe952ccab1563d5d91ff1e516478da5f222af927f2b21fa509a29984b09b0c89),
cricket curve [`0xddbc…`](https://explorer.testnet.arc.io/tx/0xddbcaaa4f9a9c4ac88bd33904b3ec33c3e363013f2ce29f89c27e68180902c56),
ETH YES [`0x1e61…`](https://explorer.testnet.arc.io/tx/0x1e619878ae4c817cd7e448062315e5973e39ae179fe1b497425220959ba8747b).

### Engine run (Suggest mode)

Prompt "Bet 0.2 USDC that total Boxing Day goals land near 24, width 4" on market 9: the
planner proposed a curve trade, the user wallet approved
([`0x8faf…`](https://explorer.testnet.arc.io/tx/0x8fafb154f464cc733dbed0959bb4ffff01635469f1feffed9640886bd512bf644)) and traded
([`0x236b…`](https://explorer.testnet.arc.io/tx/0x236bab371a97983cb7655b2c517a672caa5560417aca6809c0f69c20143980d7)).

### Market 1 lifecycle

Proposed ([`0x33f7…`](https://explorer.testnet.arc.io/tx/0x33f77e976a973a6ce8f39bed418978e51e89001b2c0dec17cbd35c59f67f8b06),
bucket 0 as a placeholder: a demo market with no real-world outcome), finalized after the dispute
window ([`0xadc8…`](https://explorer.testnet.arc.io/tx/0xadc80528a96988b386b0af3c07c9985915e7e32174054213b44d0883c08a5901)), swept by the
creator ([`0xa018…`](https://explorer.testnet.arc.io/tx/0xa01852b89661b24232e4ba531acc8942198444d8502c9e712eeaeb7fa877d10f)).
No one traded market 1, so there was nothing to redeem.

### Contract verification

MarketFactory and OracleHook are fully verified on Blockscout; the EngineBudgetVault
implementation is verified (partial match).

## Known issues

From the Arc Studio audit (0 critical, 4 high). These are disclosed, not yet fixed, because
contracts are frozen for the demo:

| ID     | Issue                                                                                              | Planned fix                                                                                                        |
| ------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| EBV-01 | Budget-vault caps don't apply to sells, so an engine key could sell vault positions at a bad price | Cap the absolute delta and require a minimum proceeds bound on sells. Autonomous mode is disabled until this ships |
| KZR-01 | Disputes need no bond, so a tiny position can stall settlement by disputing every proposal         | Bonded disputes with escalation                                                                                    |
| KZR-02 | A call with too little gas can force a valid TWAP market onto the manual path                      | Gas floor check before the fallback                                                                                |
| KZR-03 | The liquidity guard reads current liquidity, not liquidity during the window                       | Record liquidity per reading in the hook                                                                           |

Also not built: Autonomous mode, partial payouts, and x402 payments.

## Repository

```
contracts/          Solidity (Foundry): core maths, pool, factory, resolver, oracle hook, budget vault
packages/core       @kizashi/core: bigint TypeScript mirror of the core maths
packages/arkiv      @kizashi/arkiv: Arkiv entities, queries, writes, read proxy
packages/contracts  ABIs, deployments, chains
packages/schemas    zod schemas shared across processes (engine API, market metadata)
apps/web            Next.js app (wagmi + RainbowKit)
apps/engine         LangGraph engine behind an Express 5 API
```

## Run it

```sh
bun install
cp .env.example .env              # fill in RPCs, keys and Pinata (see the comments)
bun run check                     # lint, typecheck, tests, build
bun run forge:test                # contract tests
cd apps/web && bun run dev        # http://localhost:3000
```

Seed real markets (IPFS → Arc → Arkiv): `cd apps/web && bun --env-file=../../.env scripts/seed-markets.ts`.

## AI use

The project was built with AI coding agents (Claude Code, Antigravity and Codex), working from
written specs and reviewed by the author. The core maths was cross-checked against an independent
Python reference and golden vectors. At runtime, the engine uses Gemini only to _propose_ a bet.
Compiling, pricing, risk checks and execution are deterministic code, and every trade is signed by
the user.

## License

See [LICENSE](LICENSE).

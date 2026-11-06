# Kizashi

**Outcome markets that net your collateral.** Bet yes/no, or bet the *shape* of an outcome (the ETH
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

| | Invariant |
|---|---|
| I1 | Solvency: pool cash ≥ the worst-case liability over every bucket |
| I2 | Positions stay non-negative after top-up and normalisation |
| I3 | Maker loss ≤ b · ln n |
| I4 | Path additivity: trading δ₁ then δ₂ costs the same as δ₁ + δ₂ |
| I5 | Exact translation: adding a constant to every bucket costs exactly that constant |
| I6 | Freed collateral ≥ 0 |

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

| Entity | Writer | What users see |
|---|---|---|
| `kizashi.market` | listing service `0xeE5F49601ce76294c09FA38a6c85a10f25990ed3` | The lobby, with the metadata and image CIDs, and the creator recorded |
| `kizashi.curveSnapshot` | indexer `0x685317A2bFdABFbe1d4b05c334ff5272137Ef134` | The crowd-curve history chart |
| `kizashi.proposal` | engine `0x2888347C7D47E450bB7fE4193B98dB728a948FB9` | The engine inbox (10-minute expiry, then patched to approved with the tx hash) |
| `kizashi.probe` | smoke test | Testnet write/read evidence |

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

| Contract | Address |
|---|---|
| KizashiMarketFactory | `0x9220ff4A3E8239E05592c8DD6203DF3eD277C756` |
| KizashiResolver | `0xf8E601C93Fd1d98833E24d578410FDaaA69A5A70` |
| KizashiPool (implementation) | `0x494202DCD3094B576C9B34B0bB74be97E333CEab` |
| KizashiOracleHook | `0xDC01d60Ac4a389FD3Cf84959A8fc1e7EDcACd040` |
| PoolManager (Uniswap v4) | `0xAAa363AB15694eFA8ce0E5D7462F1A6123389F11` |
| KZT test token | `0x293D9e82fe0f3bDe07164D0EDfAE19eCd33E09dc` |
| EngineVaultFactory | `0xdF9c01CFb5D448043C6fC54FA365c9645D443104` |
| EngineBudgetVault (implementation, via Arc Studio) | `0xA631C3fF4128b9dA8581e636db88f7927A3df9cb` |

The full record, including every market, is in
[`contracts/deployments/5042002.json`](contracts/deployments/5042002.json). Explorer:
https://explorer.testnet.arc.io

## Known issues

From the Arc Studio audit (0 critical, 4 high). These are disclosed, not yet fixed, because
contracts are frozen for the demo:

| ID | Issue | Planned fix |
|---|---|---|
| EBV-01 | Budget-vault caps don't apply to sells, so an engine key could sell vault positions at a bad price | Cap the absolute delta and require a minimum proceeds bound on sells. Autonomous mode is disabled until this ships |
| KZR-01 | Disputes need no bond, so a tiny position can stall settlement by disputing every proposal | Bonded disputes with escalation |
| KZR-02 | A call with too little gas can force a valid TWAP market onto the manual path | Gas floor check before the fallback |
| KZR-03 | The liquidity guard reads current liquidity, not liquidity during the window | Record liquidity per reading in the hook |

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
Python reference and golden vectors. At runtime, the engine uses Gemini only to *propose* a bet.
Compiling, pricing, risk checks and execution are deterministic code, and every trade is signed by
the user.

## License

See [LICENSE](LICENSE).

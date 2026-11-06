# CONDONE.md — Kizashi core, what was built and how it works

Everything in this file is on `main` (tags `kizashi-cp0` … `kizashi-cp10`, `kizashi-core-v0.1.0`,
`kizashi-core-ts-v0.1.0`). The Arc part (D8 test deploy, C-00 contracts, deployment) is yours.

| Area | Path | Status |
|---|---|---|
| Solidity Kizashi | `contracts/src/core/` | F-CP0 → F-CP10 done; 94 forge tests green |
| Python oracle + golden vectors | `contracts/ref/`, `contracts/test/vectors/golden.json` | 381 cases, byte-identical regeneration |
| TS mirror + market maths | `packages/core/` (`@kizashi/core`) | 665 tests green, bit-exact with Solidity |

---

## 1. The idea in one paragraph

A market splits a quantity into N buckets. Every bet is a **payout vector** (how much USDC you
get if each bucket wins). One LMSR cost function prices every vector, so a binary "above 150?"
bet and a bell curve are the same kind of object. Each user holds one **position** per market,
the sum of their bets, kept non-negative by a uniform **top-up**. Because shorts and hedges sum
before collateral is computed, a user locks the worst case of the *sum* of their bets, not the
sum of each bet's worst case. That gap (gross − netted) is the thesis; `Netting` measures it.

---

## 2. File map — Solidity (`contracts/src/core/`)

| File | Lines | What it does |
|---|---:|---|
| `KizashiTypes.sol` | ~90 | `Config {n, lo, w, collateral}`, `State`, `Quote`, all 30 custom errors (`IKizashiErrors`), all 7 events (`IKizashiEvents`) |
| `IKizashiPool.sol` | ~72 | The frozen surface every other contract calls |
| `Wad.sol` | ~115 | Signed WAD maths with an explicit direction on every op; directed exp/ln bounds |
| `Grid.sol` | ~45 | Grid validation (2 ≤ N ≤ 64, w > 0), clamped `bucketOf`, `bounds` |
| `VecLib.sol` | ~85 | Exact vector add/sub/addScalar/scale/min/max/argMax/isNonNeg |
| `LSE.sol` | ~120 | LMSR `costUp`/`costDown`, `tradeCharge`, `prices`, `bFromSubsidy`, `lossBound`, `maxSizeForBudget` |
| `Shapes.sol` | ~45 | `step` (Above k), `range` (Below k = range 0..k), `validate` |
| `Netting.sol` | ~95 | `topUp`, `normalise`, raw floors, K/G/N/freed requirement helpers |
| `KizashiPool.sol` | ~300 | The market: initialize, quote, trade, release, close, resolve, redeem, sweep, views |
| `KizashiPoolStub.sol` | ~320 | Same ABI with naive `cost = max(q)`; for other lanes only, never a real market |
| `ROUNDING.md` | — | Every rounding decision with units, direction, bound and proof |

### 2.1 Units (never mix these)
- Money, q, b, positions: **signed WAD**, `1 USDC = 1e18`.
- Transfers and `cash`: **USDC base units**, `1 USDC = 1e6`. `toWad` multiplies by `1e12`.
- Probabilities: WAD fraction (`1e18` = 100%).
- Grid `lo`, `w`, `bucketOf(value)`: the market's own unit precision (not USDC, not WAD).

### 2.2 `Wad` — directed arithmetic
`mulDown/mulUp/divDown/divUp` are signed floor/ceil (toward −∞ / +∞, not toward zero).
`toUsdcUp` is used for anything the trader pays or the pool must reserve; `toUsdcDown` for
anything the pool pays out. exp/ln wrap Solady's `expWad`/`lnWad`:

| Function | Domain | Guarantee |
|---|---|---|
| `expNegUp(x)` | x ≤ 0 | ≥ exp(x), ≤ 1, exp(0) = 1 exactly |
| `expNegDown(x)` | x ≤ 0 | ≤ exp(x), ≥ 0, exp(0) = 1 exactly |
| `lnAtLeastOneUp(x)` | x ≥ 1 | ≥ ln x, ln 1 = 0 exactly |
| `lnAtLeastOneDown(x)` | x ≥ 1 | ≤ ln x, ≥ 0 |

Solady publishes no error bound, so I measured it against the 50-digit oracle on 8,063 points
over exactly the domains Kizashi uses: `expWad − exp ∈ (−1, 0]`, `lnWad − ln ∈ (−1.05, +0.05)`
WAD units. The margin is 2 on each side. The fuzz suite caught one real bug here (an upper exp
bound could exceed 1 just below 0, breaking monotonicity); it is capped at 1 now.

### 2.3 `LSE` — the LMSR
Stable form `C(q) = M + b·ln Σ exp((qᵢ − M)/b)`, `M = max q`.
- `costUp`: exponents rounded toward 0, `expNegUp`, `lnUp`, `mulUp` → never below C(q).
- `costDown`: the mirror image → never above C(q), and always ≥ max q.
- `tradeCharge(q, δ, b) = costUp(q + δ) − costDown(q)`: never undercharges.
- `prices`: each `expDown / sumUp`, rounded down, so Σp ≤ 1.
- `bFromSubsidy(S, N) = divDown(S, lnUp(N))` and `lossBound(b, N) = mulUp(b, lnUp(N))`.
  Because exp(0) is exact, `costUp(0) == lossBound(b) ≤ S` — that is the initial-solvency proof.
- `maxSizeForBudget(q, b, unit, budget)`: binary search for the largest size whose charge fits
  (spend-to-size for Simple and Expressive modes).

### 2.4 `Netting` — collateral accounting (ACCOUNTING.md)
- `topUp(P, δ) = K(P + δ)` with `K(v) = max(0, −min v)`; `normalise` returns `(k, δ + k·1, P')`.
- Requirement helpers over **original signed tickets**: `grossCollateral` G = Σ K(tᵢ),
  `nettedCollateral` N = K(Σ tᵢ), `freed` F = G − N ≥ 0.
- Raw floors `floorOf`, `grossFloors`, `nettedFloor` are *not* collateral values (kept separate on
  purpose). All five ACCOUNTING §3 examples are exact golden cases.

### 2.5 `KizashiPool` — one market
State: `q` (outstanding payout per bucket = Σ positions), per-owner positions, `cash` (USDC
actually held), `b`, lifecycle, resolver, creator.

| Call | Who | Effect |
|---|---|---|
| `initialize(config, subsidyUsdc, creator, resolver, closeTime)` | factory / anyone once | validates grid and bounds (1 – 1e9 USDC subsidy), sets b, pulls subsidy from `msg.sender`, rejects fee-on-transfer tokens, checks `cash ≥ costUp(0)` |
| `quote(owner, δ)` view | anyone | validates δ (|entry| ≤ 1e12 USDC, not all zero), normalizes against **owner's** position, returns charge (WAD and signed USDC), top-up, normalized δ, prices after |
| `trade(δ, limitUsdc, deadline)` | position owner = `msg.sender` | applies normalized δ to q and position, moves USDC (pay in rounded up / paid out rounded down), re-checks solvency |
| `release(r)` | owner | requires 0 < r ≤ floor; q and position −r·1; pays ⌊r⌋ USDC |
| `close()` | anyone after closeTime | Open → Closed |
| `resolve(k)` | resolver | Closed → Resolved, winning bucket k |
| `redeem()` | owner | pays ⌊P_k⌋, deletes the position |
| `sweep()` | creator, repeatable | pays only `cash − ⌈unredeemed winning claims⌉`; user claims never expire |

`Traded` emits the **original** signed δ plus `topUpWad`, `chargeWad`, `chargeUsdc`; q and the
position change by exactly `δ + topUp·1`, so the indexer can replay G/N/F and positions exactly.

Gas (N = 16 / 32 / 64): trade 0.43M / 0.79M / 1.51M, quote 0.23M / 0.44M / 0.86M.
Runtime size 10.9 KB (13.6 KB margin under the 24 KB limit).

---

## 3. Invariants and why they hold

| # | Property | How it is enforced / tested |
|---|---|---|
| I1 | open: `cash ≥ costUp(q) ≥ max q`; resolved: `cash ≥ unredeemed claims` | `_requireSolvent()` after every money move; invariant suite 1,000 runs × 64 calls, 5 actors, 0 reverts |
| I2 | every position ≥ 0, and Σ positions = q | invariant suite |
| I3 | maker loss ≤ b·ln N | proof below + invariant suite settling every run |
| I4 | split trades never undercharge; overcharge ≤ one bound gap | fuzz 10,000 runs |
| I5 | `cost(q + k·1) = cost(q) + k` | **exact** (0 error) for both bounds, fuzz 10,000 runs |
| I6 | freed ≥ 0; counter-trade top-up ≤ standalone top-up | fuzz 10,000 runs |

Proof sketch (full text in `ROUNDING.md`): each trade adds ⌈charge⌉ ≥ costUp(q') − costDown(q)
≥ costUp(q') − costUp(q), and release translates q exactly while paying ⌊r⌋, so
`cash − costUp(q)` never decreases from its start `S − lossBound ≥ 0`. At resolution the surplus is
at least `costUp(q) − q_k + S − lossBound ≥ S − lossBound`, so the maker loses at most `lossBound`.

---

## 4. Oracle and golden vectors (F-CP3)

- `contracts/ref/kizashi_ref.py`: independent real-valued maths in mpmath at 50 digits. It never
  copies the Solidity rounding.
- `contracts/ref/gen_vectors.py` (seed 20261106): 381 cases — exp 40, ln 40, usdc 20, mul/div 30,
  bucketOf 20, cost 80, trade 60, prices 30, subsidy 16, shapes 20, netting 25. Edges covered:
  N = 2 and 64, S = 1 USDC and 1e9 USDC, one bucket at ±1e6·b.
- Regenerate with `just vectors` (or `cd contracts/ref && python3 gen_vectors.py > ../test/vectors/golden.json`);
  two runs are byte-identical. SHA-256 at freeze is recorded in the F-CP0 handoff section.
- Transcendental cases store `refFloor`/`refCeil` (directed results must not cross them) and an
  `absBound`; acceptance is `max(absBound, |ref|·1e-12)` as NUMERICS requires.

---

## 5. TS mirror and market maths (`packages/core`)

Every bigint function has the same name and the **same output** as Solidity:
`exp-ln.ts` is a line-for-line BigInt port of Solady's `expWad`/`lnWad` (BigInt `/` truncates
like EVM `sdiv`, `>>` is arithmetic like `sar`). Proof of parity: `ParityDump.t.sol` writes the
real Solidity results for all golden inputs into `test/fixtures/solidity-parity.json`, and
`parity.test.ts` requires exact equality — all 1,023 values match.

| Module | Exports |
|---|---|
| `wad.ts` | `toWad`, `toUsdcDown/Up`, `chargeToUsdc`, `mulDown/Up`, `divDown/Up`, directed exp/ln |
| `grid.ts`, `vec.ts` | `validateGrid`, `bucketOf`, `bounds`; vector helpers |
| `lse.ts` | `costUp`, `costDown`, `tradeCharge`, `prices`, `bFromSubsidy`, `lossBound`, `maxSizeForBudget` |
| `netting.ts` | `topUp`, `normalise`, `floorOf`, `grossFloors`, `nettedFloor`, `collateralRequired`, `grossCollateral`, `nettedCollateral`, `freed` |
| `quote.ts` | `quoteTrade(q, b, position, δ)` — off-chain mirror of `KizashiPool.quote` |
| `shapes.ts` | `step`, `range`, **`gaussianShape(grid, mean, sigma)`**, `sigmaBounds`, `normalCdf` |
| `modes.ts` | **mode bridge**: `crowdMedian`, `expressiveToSimple`, `simpleToExpressive`, `nearestThreshold` |
| `float.ts` | display only: `pricesFloat`, `gaussianDisplay` |

**Market maths specifics**
- *Simple mode*: Above k = `step(n, k, size)`, Below k = `range(n, 0, k, size)`; k must be a
  real edge (1 … n−1).
- *Expressive mode*: `gaussianShape` gives a unit shape with peak exactly 1e18; weights below
  1e-4 of the peak become 0; bucket 0 and N−1 absorb the mass outside the grid (matching
  resolution). σ must be in [w/2, N·w/2], μ in [lo, hi]. The CDF is the only float step and uses
  a hand-written exp built from + − × ÷ only, so the shape is identical in every JS runtime
  (`Math.exp` is not guaranteed to be). Bucket masses are taken from the far-side tail so a curve
  is exactly symmetric. A frozen snapshot pins the output.
- *Spend-to-size*: `maxSizeForBudget(q, b, unit, toWad(spendUsdc))` gives the largest size whose
  charge in USDC (rounded up) still fits the spend.
- *Mode switch* (§4): Expressive → Simple picks Above if μ ≥ crowd median, at the edge nearest
  μ − σ (Above) or μ + σ (Below). Simple → Expressive sets σ = 2 buckets (clamped) and
  μ = edge ± σ (clamped). Crowd median = centre of the first bucket where cumulative price ≥ ½.

Not in this package (UI-07 lane): the curve-editor component itself.

---

## 6. Decisions I made that you should confirm (D5)

1. `b` is derived at `initialize`, not passed in `Config`.
2. `initialize` takes an explicit `creator`; subsidy is pulled from `msg.sender`.
3. `quote(owner, δ)` names the owner; `trade` always uses `msg.sender` (a vault is the owner).
4. Signed `limitUsdc` (negative = minimum payout demanded); charge rounds as in §2.5.
5. Zero trade reverts. `tradeCharge(0)` in the library returns the non-negative bound gap.
6. Claims never expire; sweep is repeatable and never touches unredeemed claims.
7. Release/redeem dust below 1 USDC base unit stays in the pool.
8. `bucketOf(value)` takes grid units, so the TWAP hook must scale its price to the grid first.
9. Bounds: subsidy 1 – 1e9 USDC, |δ entry| ≤ 1e12 USDC, |q| ≤ 1e15 USDC.
10. **I4 tolerance**: the inherited "2 WAD units" target is not achievable with directed bounds
    once b > 1e17; the proven gap is ⌈b(4N+4)/1e18⌉ + 2 WAD units (≈ 0.00000026 USDC for
    b = 1,000 USDC, N = 64). Approve this bound or ask for a tighter algorithm.
11. exp/ln margins rest on measured Solady error plus golden regression tests, not a formal proof.
12. Gaussian tails absorb out-of-grid mass into the edge buckets; ties in `nearestThreshold`
    round up.

---

## 7. How to run

```
# Solidity (from contracts/, in WSL)
forge build
forge test                                  # 94 tests, ~45 s (invariants 1,000 x 64)
FOUNDRY_PROFILE=ci forge test --mt testFuzz # 10,000-run fuzz pass
forge test --mc Bench -vv                   # gas table
just vectors                                # regenerate golden.json (byte-identical)
KIZASHI_PARITY_DUMP=true forge test --mc ParityDump --gas-limit 9000000000000 -vv \
  | python3 ref/parity_fixture.py > ../packages/core/test/fixtures/solidity-parity.json

# TypeScript
bunx turbo run test --filter=@kizashi/core   # 665 tests
```

---

## 8. What is left for the Arc part (yours)

- **D8**: deploy a minimal contract at `cancun` and at `paris` on Arc testnet, find the v4
  PoolManager. Kizashi itself avoids transient storage, so it compiles under either target.
- **C-00 contracts** that call Kizashi: `KizashiMarketFactory` (clone + `initialize`),
  `KizashiOracleHook` (TWAP → `bucketOf` → `resolve`), `EngineVault` (the vault is the position
  owner, so it calls `trade` and `quote(vault, δ)`).
- Deploy scripts and the Arc deployment artifact for INT-01.
- Board: F-CP0 … F-CP10, F-TS1 and F-TS2 are ready for your review; I did not change any status.

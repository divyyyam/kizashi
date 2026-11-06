# ROUNDING.md — every rounding decision in Kizashi

Units: money and q are signed WAD (1 USDC = 1e18 WAD units); transfers are USDC base units
(1 USDC = 1e6). 1 USDC base unit = 1e12 WAD units. Rule: **charges round up, payouts and
releases round down; every bound is directed toward the pool.**

| Operation | Where | Units | Direction | Bound / dust | Why |
|---|---|---|---|---|---|
| `toWad(usdc)` | Wad | base → WAD | exact | 0 | integer scale |
| `toUsdcUp(wad)` | Wad | WAD → base | up (+∞) | < 1 base unit | trader pays charge; sweep reserve |
| `toUsdcDown(wad)` | Wad | WAD → base | down | < 1 base unit stays in pool | release, redeem, sell payout |
| `mulUp / mulDown` | Wad | WAD·WAD → WAD | ±∞ (signed floor/ceil) | 1 WAD unit | named at each call site |
| `divUp / divDown` | Wad | WAD/WAD → WAD | ±∞ (signed floor/ceil) | 1 WAD unit | named at each call site |
| `expNegUp(x≤0)` | Wad | WAD → WAD | ≥ exp(x), ≤ 1 | expWad + 2 (exp(0) = 1 exact) | upper cost terms |
| `expNegDown(x≤0)` | Wad | WAD → WAD | ≤ exp(x), ≥ 0 | expWad − 2 (exp(0) = 1 exact) | lower cost terms, prices |
| `lnAtLeastOneUp(x≥1)` | Wad | WAD → WAD | ≥ ln x | lnWad + 2 (ln 1 = 0 exact) | upper cost, b, loss bound |
| `lnAtLeastOneDown(x≥1)` | Wad | WAD → WAD | ≤ ln x, ≥ 0 | lnWad − 2 | lower cost |
| `costUp(q)` | LSE | WAD | ≥ C(q) | ≤ C(q) + ⌈b(4N+4)/1e18⌉ + 2 | charge side, solvency check |
| `costDown(q)` | LSE | WAD | ≤ C(q), ≥ max q | same gap | subtracted in tradeCharge |
| `tradeCharge` | LSE | WAD | ≥ true charge | ≤ true + 2·gap | costUp(after) − costDown(before) |
| `prices` | LSE | prob WAD | each ≤ true | ≤ 8N + 8 units; Σ ≤ 1e18 | display, quotes |
| `bFromSubsidy(S, N)` | LSE | WAD | down: b·lnUp(N) ≤ S | ≤ ⌈8S/1e18⌉ + 2 | proves initial solvency |
| `lossBound(b, N)` | LSE | WAD | up | ≤ ⌈4b/1e18⌉ + 2 | = costUp(0); maker-loss claim |
| `maxSizeForBudget` | LSE | WAD | down (largest affordable) | exact search | spend-to-size |
| normalization `k = K(P+δ)` | Netting | WAD | exact | 0 | integer min |
| release `r` | Pool | WAD → base | pays `toUsdcDown(r)` | < 1 base unit per call | translation is exact |
| redeem `P_k` | Pool | WAD → base | pays `toUsdcDown(P_k)` | < 1 base unit per redeemer | per-user floor |
| sweep reserve | Pool | WAD → base | keeps `toUsdcUp(outstanding)` | < 1 base unit | claims never under-reserved |

## Evidence for the exp/ln margins

Solady `expWad`/`lnWad` carry no published bound. Measured against the 50-digit oracle
(`contracts/ref/kizashi_ref.py`) on 8,063 points across Kizashi's domains (exp on [−41.5, 0], ln
on [1, 64]): `expWad − exp ∈ (−1, 0]`, `lnWad − ln ∈ (−1.05, +0.05)` WAD units. MARGIN = 2 covers
both with room. Golden vectors (exp 40, ln 40 cases) re-check the directed bounds on every
`forge test`. This is empirical evidence plus regression testing, not a formal proof.

## Proved consequences

- **Initial solvency:** `costUp(0) = mulUp(b, lnUp(N))` (all exponents 0, exp(0) exact) and
  `b = divDown(S, lnUp(N))`, so `costUp(0) ≤ S`.
- **Trade keeps I1:** cash' = cash + ⌈charge⌉ ≥ costUp(q) + costUp(q') − costDown(q) ≥ costUp(q').
- **Release keeps I1:** costUp(q − r·1) = costUp(q) − r exactly (M shifts by r; exponents unchanged);
  paying ⌊r⌋ ≤ r.
- **I3:** cash − costUp(q) never decreases, so at resolution
  surplus = cash − q_k ≥ costUp(q) − q_k + (S − lossBound) ≥ S − lossBound, i.e. maker loss ≤ lossBound.
- **I5:** translation is exact for both costUp and costDown (achieved 0 vs inherited target N units).
- **I4:** split − whole = costUp(q+A) − costDown(q+A) ∈ [0, ⌈b(4N+4)/1e18⌉ + 2]. The inherited
  2-WAD-unit target is not met for b > 1e17; the bound scales with b. **D5 decision for Divyam.**

# Uniswap v4 feedback (Kizashi, ETHGlobal Mumbai 2026)

We used v4 as an **on-chain price oracle** for settling outcome markets. `KizashiOracleHook`
records a reading on every swap, and our resolver settles a market from the TWAP over a window
ending at close.

## What worked well

- **Hooks are the right primitive for oracles.** `afterInitialize` plus `afterSwap` let us keep a
  per-pool observation ring buffer without touching the core, and the hook address flags make the
  permissions auditable at a glance.
- **OpenZeppelin `uniswap-hooks` `BaseHook`** removed most of the boilerplate, and its permission
  checks caught a flag mismatch early.
- **`Deployers` in v4-core's test utils** gave us a full PoolManager, routers and currencies in a few
  lines, so the hook was tested against the real core from day one.
- **`HookMiner`** made CREATE2 mining for the flag bits painless.

## Friction

1. **No v4 deployment on Arc (or on many newer chains).** We deployed our own `PoolManager`, test
   routers and a pool, which costs time and means no real liquidity. A published deployment list
   with "deploy it yourself" instructions per chain (deterministic addresses through the standard
   CREATE2 deployer) would help a lot.
2. **No built-in oracle in v4.** v3's `observe()` is gone, so every project that needs a TWAP
   re-implements an observation hook. An official, audited reference oracle hook (a ring buffer, a
   `consult(from, to)` view, cardinality growth) would stop everyone writing their own, and the
   bugs that come with that.
3. **TWAP safety is subtle and undocumented for v4.** We hit three issues ourselves (also flagged by
   our audit):
   - A window can be pushed out of the buffer by many swaps, which is a liveness denial of
     service. We added a fallback to manual resolution.
   - A liquidity guard that reads *current* liquidity can be gamed across the window.
   - Gas griefing on the consult path.

   A short "building oracles on v4" guide covering these would be valuable.
4. **Testing swaps from scripts on non-standard chains.** Arc's USDC is a native precompile that
   `forge script` can't simulate (StackUnderflow at the blocklist precompile). We moved swap and
   liquidity steps to `cast send`. Docs that mention running routers through plain transactions
   would help others on chains like this.
5. **Tick ↔ price with mixed decimals** (18-decimal base, 6-decimal USDC quote) is easy to get off by
   10¹². A helper in the periphery, or worked examples for `getQuoteAtTick`-style conversions with
   decimals, would save time.

## Where the integration lives

- `contracts/src/hooks/KizashiOracleHook.sol`: the hook.
- `contracts/src/resolution/KizashiResolver.sol`: `resolveFromTwap`, `gridValue`, the guards and
  the fallback.
- `contracts/test/unit/KizashiOracleHook.t.sol`, `KizashiResolver.t.sol`: tests, including a
  725-swap window-eviction case.
- `contracts/script/deploy-arc.sh`, `swap-arc.sh`: deployment and swaps on Arc testnet.

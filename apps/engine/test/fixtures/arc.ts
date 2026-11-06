import { bFromSubsidy, quoteTrade, toWad } from "@kizashi/core";
import type { TickContext } from "@kizashi/schemas/engine";
import { type Address, getAddress, type PublicClient } from "viem";
import type { ArcReader } from "../../src/services/arc/context";

export const POOL = getAddress("0x71ce3111664da28a62137cecf708f11cf15f372f");
export const OWNER = getAddress("0xea3ca827e1a816c4b9f44e55bdf08877f9506de5");
const N = 16;

/** Pool state for a fresh 16-bucket market (lo 130, w 2) funded with 2 USDC. */
export function poolState() {
  return {
    n: N,
    lo: 130n,
    w: 2n,
    b: bFromSubsidy(toWad(2_000_000n), N),
    q: Array.from({ length: N }, () => 0n),
    position: Array.from({ length: N }, () => 0n),
  };
}

type Call = { functionName: string; args?: readonly unknown[] };

/** Stubs only the RPC boundary: answers each pool read from the in-memory state above. */
export function fakeArc(options: { chainSkewWad?: bigint } = {}): ArcReader {
  const s = poolState();
  const answers: Record<string, (call: Call) => unknown> = {
    poolOf: () => POOL,
    config: () => ({ n: BigInt(s.n), lo: s.lo, w: s.w, collateral: POOL }),
    state: () => 1,
    closeTime: () => 1_900_000_000n,
    b: () => s.b,
    q: () => s.q,
    prices: () => s.q.map(() => 10n ** 18n / BigInt(s.n)),
    positionOf: () => s.position,
    floorOf: () => 0n,
    balanceOf: () => 3_000_000n,
    quote: (call) => {
      const delta = call.args?.[1] as bigint[];
      const q = quoteTrade(s.q, s.b, s.position, delta);
      return { ...q, chargeWad: q.chargeWad + (options.chainSkewWad ?? 0n) };
    },
  };
  const client = {
    getBlockNumber: async () => 100n,
    readContract: async (call: Call) => {
      const answer = answers[call.functionName];
      if (!answer) throw new Error(`unexpected read ${call.functionName}`);
      return answer(call);
    },
  } as unknown as PublicClient;
  return {
    client,
    chainId: 5042002,
    deployments: { factory: POOL as Address, usdc: POOL as Address },
  };
}

export function arcContext(markets: TickContext["markets"]): TickContext {
  return {
    chainId: 5042002,
    positionOwner: OWNER,
    fetchedAtBlock: "100",
    nowSec: 1_800_000_000,
    availableUsdc: "3000000",
    killSwitch: false,
    markets,
    spend: [],
  };
}

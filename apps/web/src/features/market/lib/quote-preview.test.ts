import { describe, expect, test } from "bun:test";
import { bFromSubsidy, prices, toWad, WAD } from "@kizashi/core";
import type { MarketDetail, OwnerPosition } from "../types";
import { initialDraft } from "./defaults";
import { createDraftStore } from "./draft-store";
import { buildQuote, parseSpend } from "./quote-preview";

const market: MarketDetail = {
  chainId: 31337,
  marketId: "0",
  question: "Accounting verification",
  unit: "u",
  precision: 1,
  kind: "expressive",
  grid: { n: 32, lo: -160n, w: 10n },
  pricesWad: [],
  closeTimeSec: 0,
  status: "open",
  bWad: bFromSubsidy(toWad(100_000_000n), 32),
  qWad: Array(32).fill(0n),
  blockHash: "0x01",
  blockNumber: 1n,
};
market.pricesWad = prices(market.qWad, market.bWad);
const position: OwnerPosition = {
  chainId: 31337,
  marketId: "0",
  owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  positionWad: Array(32).fill(0n),
  history: { status: "complete", originalTicketsWad: [] },
  blockHash: market.blockHash,
  blockNumber: 1n,
};
describe("spend and quote accounting", () => {
  test("parses transfer precision without float money", () => {
    expect(parseSpend("4.200001")).toBe(4_200_001n);
    expect(parseSpend("0")).toBeUndefined();
    expect(parseSpend("1.0000001")).toBeUndefined();
    expect(parseSpend("1e2")).toBeUndefined();
  });
  test.each([1, 16, 31])("simple edge %i stays within budget and keeps the step", (threshold) => {
    const draft = { ...initialDraft(market), mode: "simple" as const, threshold, spend: "4.20" };
    const q = buildQuote({ market, position, draft });
    expect(q).toBeDefined();
    if (!q) return;
    expect(q.chargeUsdc).toBeLessThanOrEqual(4_200_000n);
    expect(q.chargeUsdc).toBeGreaterThanOrEqual(4_199_999n);
    expect(q.topUpWad).toBe(0n);
    expect(q.rawCostWad).toBe(q.chargeWad);
    expect(q.deltaWad.slice(0, threshold).every((x) => x === 0n)).toBe(true);
    expect(q.deltaWad.slice(threshold).every((x) => x === q.maxPayoutWad)).toBe(true);
    expect(q.requirements).toEqual({ status: "ready", lockedWad: 0n, freedChangeWad: 0n });
  });
  test("expressive fresh-book quote retains unknown history without erasing current floor", () => {
    const q = buildQuote({
      market,
      position: {
        ...position,
        positionWad: Array(32).fill(3n * WAD),
        history: { status: "unavailable", reason: "History not indexed" },
      },
      draft: { ...initialDraft(market), spend: "2" },
    });
    expect(q?.chargeUsdc).toBeLessThanOrEqual(2_000_000n);
    expect(q?.currentFloorWad).toBe(3n * WAD);
    expect(q?.requirements.status).toBe("unavailable");
  });
  test("rejects a position from a stale block or other market", () => {
    const draft = { ...initialDraft(market), spend: "2" };
    expect(() =>
      buildQuote({ market, position: { ...position, blockHash: "0x02" }, draft }),
    ).toThrow();
    expect(() => buildQuote({ market, position: { ...position, marketId: "1" }, draft })).toThrow();
  });
  test("mode bridge preserves spend and rebuilds parameters", () => {
    const store = createDraftStore(market);
    store.getState().patch({ spend: "4.20", mean: 0n, sigma: 20n });
    store.getState().switchMode("simple");
    expect(store.getState().spend).toBe("4.20");
    expect(store.getState().direction).toBe("above");
    expect(store.getState().threshold).toBe(14);
    store.getState().switchMode("expressive");
    expect(store.getState().mean).toBe(0n);
    expect(store.getState().sigma).toBe(20n);
    expect(store.getState().spend).toBe("4.20");
  });
});

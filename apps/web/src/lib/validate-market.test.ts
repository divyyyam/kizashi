import { describe, expect, it } from "bun:test";
import { validateMarketSnapshot } from "./validate-market";

describe("market snapshot boundary", () => {
  const valid = { count: 2, width: 1n, liquidity: 100n, prices: [500n, 500n] };
  it("rejects empty or mismatched vectors before rendering or quoting", () => {
    for (const snapshot of [
      { ...valid, prices: [] },
      { ...valid, quantities: [0n] },
      { ...valid, count: 1 },
      { ...valid, width: 0n },
      { ...valid, prices: [-1n, 1n] },
    ])
      expect(() => validateMarketSnapshot(snapshot)).toThrow();
  });
  it("accepts a complete snapshot without imposing new price rounding tolerances", () => {
    expect(() => validateMarketSnapshot({ ...valid, quantities: [0n, 0n] })).not.toThrow();
  });
});

import { describe, expect, test } from "bun:test";
import {
  gaussianDisplay,
  gaussianShape,
  KizashiError,
  prices,
  pricesFloat,
  WAD,
} from "../src/index";
import { expDeterministic } from "../src/shapes";

const grid = { n: 32, lo: 0n, w: 10n };

describe("gaussianShape (market spec §3.2)", () => {
  test("peak is exactly 1 WAD and every weight is in [0, 1]", () => {
    const s = gaussianShape(grid, 160n, 20n);
    // biome-ignore lint/complexity/useMathMinMax: bigint operands; Math.min/max do not accept bigint
    expect(s.reduce((m, x) => (x > m ? x : m), 0n)).toBe(WAD);
    expect(s.every((x) => x >= 0n && x <= WAD)).toBe(true);
  });

  test("symmetric about a bucket-edge mean", () => {
    const s = gaussianShape(grid, 160n, 25n);
    for (let i = 0; i < 16; i++) expect(s[15 - i]).toBe(s[16 + i]);
  });

  test("tails below 1e-4 of the peak are zero", () => {
    const s = gaussianShape(grid, 160n, 5n);
    expect(s[0]).toBe(0n);
    expect(s[31]).toBe(0n);
  });

  test("edge buckets absorb the mass outside the grid", () => {
    const s = gaussianShape(grid, 0n, 30n);
    expect(s[0]).toBe(WAD);
  });

  test("deterministic across repeated calls and frozen expectations", () => {
    const a = gaussianShape({ n: 8, lo: 100n, w: 5n }, 117n, 6n);
    expect(gaussianShape({ n: 8, lo: 100n, w: 5n }, 117n, 6n)).toEqual(a);
    expect(a).toMatchSnapshot();
  });

  test("min and max sigma are accepted; outside is rejected", () => {
    expect(() => gaussianShape(grid, 100n, 5n)).not.toThrow();
    expect(() => gaussianShape(grid, 100n, 160n)).not.toThrow();
    expect(() => gaussianShape(grid, 100n, 4n)).toThrow(KizashiError);
    expect(() => gaussianShape(grid, 100n, 161n)).toThrow(KizashiError);
    expect(() => gaussianShape(grid, -1n, 20n)).toThrow(KizashiError);
  });

  test("deterministic exp matches Math.exp closely", () => {
    for (const x of [-50, -10, -1, -0.5, 0, 0.3, 2, 10]) {
      expect(Math.abs(expDeterministic(x) - Math.exp(x)) / Math.exp(x)).toBeLessThan(1e-14);
    }
  });
});

describe("display helpers", () => {
  test("gaussianDisplay sums to 1", () => {
    const d = gaussianDisplay(grid, 160, 20);
    expect(Math.abs(d.reduce((s, x) => s + x, 0) - 1)).toBeLessThan(1e-12);
  });

  test("pricesFloat agrees with bigint prices within 1e-9", () => {
    const q = [0n, 3n * WAD, -2n * WAD, WAD];
    const b = 2n * WAD;
    const exact = prices(q, b);
    pricesFloat(q, b).forEach((p, i) => {
      expect(Math.abs(p - Number(exact[i] ?? 0n) / 1e18)).toBeLessThan(1e-9);
    });
  });
});

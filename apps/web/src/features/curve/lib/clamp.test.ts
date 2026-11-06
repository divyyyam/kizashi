import { describe, expect, test } from "bun:test";
import { clampCurveParams } from "./clamp";
import { curveGeometry, draftDistribution } from "./geometry";
import { keyboardCurve } from "./keyboard";

const grid = { lo: -16, width: 0.5, count: 64, unit: "u", precision: 1 };
describe("curve interaction geometry", () => {
  test("clamps both axes, including a nonunit grid", () => {
    expect(clampCurveParams(grid, { mean: -100, sigma: 0 })).toEqual({ mean: -16, sigma: 0.25 });
    expect(clampCurveParams(grid, { mean: 100, sigma: 100 })).toEqual({ mean: 16, sigma: 16 });
  });
  test("keyboard widths and endpoints follow the spec", () => {
    const value = { mean: 0, sigma: 2 };
    expect(
      keyboardCurve({ grid, value, handle: "sigma", key: "ArrowRight", shift: false })?.sigma,
    ).toBe(2.125);
    expect(
      keyboardCurve({ grid, value, handle: "mean", key: "ArrowLeft", shift: true })?.sigma,
    ).toBe(1.875);
    expect(keyboardCurve({ grid, value, handle: "sigma", key: "Home", shift: false })?.sigma).toBe(
      0.25,
    );
    expect(keyboardCurve({ grid, value, handle: "mean", key: "End", shift: false })?.mean).toBe(16);
  });
  test("distribution and geometry share axes and invert drag coordinates", () => {
    const draft = draftDistribution(grid, { mean: 0, sigma: 2 });
    expect(draft.reduce((sum, p) => sum + p, 0)).toBeCloseTo(1, 12);
    const g = curveGeometry({
      grid,
      width: 360,
      height: 320,
      crowd: Array(64).fill(1 / 64),
      draft,
    });
    expect(g.inverseX(g.x(-7.5))).toBeCloseTo(-7.5, 12);
    expect(g.y(0)).toBe(g.baseline);
    expect(g.points(draft)).toHaveLength(64);
  });
});

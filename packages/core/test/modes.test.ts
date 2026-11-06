import { expect, test } from "bun:test";
import {
  bFromSubsidy,
  crowdMedian,
  expressiveToSimple,
  maxSizeForBudget,
  nearestThreshold,
  prices,
  quoteTrade,
  simpleToExpressive,
  step,
  toWad,
  WAD,
} from "../src/index";

const grid = { n: 20, lo: 100n, w: 5n };

test("flat book median is the grid midpoint bucket centre", () => {
  const p = prices(Array(20).fill(0n), WAD);
  expect(crowdMedian(grid, p)).toBe(100n + 9n * 5n + 2n);
});

test("expressive -> simple picks the side by median and the edge nearest mean -/+ sigma", () => {
  expect(expressiveToSimple(grid, { mean: 160n, sigma: 10n }, 150n)).toEqual({
    direction: "above",
    threshold: 10,
  });
  expect(expressiveToSimple(grid, { mean: 140n, sigma: 10n }, 150n)).toEqual({
    direction: "below",
    threshold: 10,
  });
});

test("simple -> expressive uses sigma = 2 buckets and clamps the mean", () => {
  expect(simpleToExpressive(grid, { direction: "above", threshold: 10 })).toEqual({
    mean: 160n,
    sigma: 10n,
  });
  expect(simpleToExpressive(grid, { direction: "below", threshold: 1 })).toEqual({
    mean: 100n,
    sigma: 10n,
  });
  expect(
    simpleToExpressive({ n: 2, lo: 0n, w: 10n }, { direction: "above", threshold: 1 }).sigma,
  ).toBe(10n);
});

test("nearest threshold stays a valid step edge", () => {
  expect(nearestThreshold(grid, -1_000n)).toBe(1);
  expect(nearestThreshold(grid, 10_000n)).toBe(19);
  expect(nearestThreshold(grid, 112n)).toBe(2);
});

test("spend-to-size: the chosen size is affordable in USDC and one more unit is not", () => {
  const q = Array(20).fill(0n);
  const b = bFromSubsidy(toWad(100_000_000n), 20);
  const unit = step(20, 12, WAD);
  const spend = 25_000_000n; // 25 USDC
  const size = maxSizeForBudget(q, b, unit, toWad(spend));
  const position = Array(20).fill(0n);
  const fits = quoteTrade(q, b, position, step(20, 12, size));
  const over = quoteTrade(q, b, position, step(20, 12, size + 1n));
  expect(fits.chargeUsdc <= spend).toBe(true);
  expect(over.chargeWad > toWad(spend)).toBe(true);
  expect(fits.topUpWad).toBe(0n);
});

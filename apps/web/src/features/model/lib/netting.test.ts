import { describe, expect, test } from "bun:test";
import { estimateNetting, type PayoutLeg } from "./netting";

const DOMAIN = { lo: 0, hi: 10 };
const above = (threshold: number, payout: number, stakeUsd: number): PayoutLeg => ({
  stakeUsd,
  payoutAt: (x) => (x > threshold ? payout : 0),
});
const below = (threshold: number, payout: number, stakeUsd: number): PayoutLeg => ({
  stakeUsd,
  payoutAt: (x) => (x <= threshold ? payout : 0),
});

describe("estimateNetting", () => {
  test("a single bet locks its stake either way", () => {
    expect(estimateNetting([above(5, 10, 4)], DOMAIN)).toEqual({
      grossLockedUsd: 4,
      nettedLockedUsd: 4,
    });
  });

  test("offsetting sides lock only the worst-case gap", () => {
    const result = estimateNetting([above(5, 8, 4), below(5, 8, 4)], DOMAIN);
    expect(result.grossLockedUsd).toBe(8);
    expect(result.nettedLockedUsd).toBe(0);
  });

  test("partial overlap keeps the uncovered loss", () => {
    const result = estimateNetting([above(5, 6, 4), below(5, 3, 2)], DOMAIN);
    expect(result.grossLockedUsd).toBe(6);
    expect(result.nettedLockedUsd).toBe(3);
  });

  test("never locks more than the gross figure", () => {
    const result = estimateNetting([above(2, 5, 3), above(7, 9, 1)], DOMAIN);
    expect(result.nettedLockedUsd).toBeLessThanOrEqual(result.grossLockedUsd);
  });
});

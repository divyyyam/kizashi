import { expect, test } from "bun:test";
import { planOutputSchema } from "@kizashi/schemas/engine";

test("planner validates opaque market ids, scaled coordinates and integer USDC spend", () => {
  const candidate = {
    marketId: "opaque-market",
    shape: { kind: "binary", threshold: "1250", side: "above", precision: 1 },
    spendUsdc: "1000000",
    rationale: "Allowed by the selected rule.",
    ruleRefs: ["rule-1"],
  };
  const plan = { action: "trade", candidates: [candidate], rationale: "One candidate." };
  expect(planOutputSchema.safeParse(plan).success).toBe(true);
  expect(planOutputSchema.safeParse({ ...plan, candidates: [] }).success).toBe(false);
  expect(
    planOutputSchema.safeParse({ ...plan, candidates: Array(4).fill(candidate) }).success,
  ).toBe(false);
  expect(
    planOutputSchema.safeParse({ ...plan, candidates: [{ ...candidate, spendUsdc: "1.5" }] })
      .success,
  ).toBe(false);
  expect(
    planOutputSchema.safeParse({
      ...plan,
      candidates: [{ ...candidate, shape: { ...candidate.shape, threshold: "1.5" } }],
    }).success,
  ).toBe(false);
});

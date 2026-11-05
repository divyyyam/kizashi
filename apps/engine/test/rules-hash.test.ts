import { expect, test } from "bun:test";
import { ruleSetSchema } from "@kizashi/schemas/engine";
import { canonicalJson, rulesHash } from "../src/services/rules-hash";

test("canonical JSON sorts nested object keys and serializes bigint as decimal strings", () => {
  expect(canonicalJson({ z: [{ b: 2n, a: "a" }], a: true })).toBe(
    '{"a":true,"z":[{"a":"a","b":"2"}]}',
  );
});

test("rules hash is stable across key ordering and changes when confirmed rules change", () => {
  const rules = ruleSetSchema.parse({
    budgetUsdc: "10000000",
    perTradeCapUsdc: "1000000",
    dailyCapUsdc: "2000000",
    maxLossPerMarketUsdc: "3000000",
    maxDrawdownUsdc: "4000000",
    stopAtSec: 2000000000,
    allowedMarketIds: ["market-a"],
    allowedShapes: ["binary"],
    notes: "",
  });
  expect(rulesHash(rules)).toBe(rulesHash({ ...rules }));
  expect(rulesHash(rules)).not.toBe(rulesHash({ ...rules, budgetUsdc: "10000001" }));
  expect(ruleSetSchema.safeParse({ ...rules, budgetUsdc: "-1" }).success).toBe(false);
  expect(ruleSetSchema.safeParse({ ...rules, unknown: true }).success).toBe(false);
});

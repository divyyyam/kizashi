import { expect, test } from "bun:test";
import { gaussianShape, maxSizeForBudget, mulDown, range, step, toWad } from "@kizashi/core";
import { compiledTradeSchema, type RuleSet } from "@kizashi/schemas/engine";
import { decodeFunctionData } from "viem";
import { poolAbi } from "../src/services/arc/abi";
import { compileCandidate, unitShape } from "../src/services/arc/compile";
import { readPool } from "../src/services/arc/context";
import { evaluateTrade } from "../src/services/risk";
import { arcContext, fakeArc, OWNER, POOL, poolState } from "./fixtures/arc";

const snapshot = { ...poolState(), pool: POOL };
const rules: RuleSet = {
  budgetUsdc: "1000000",
  perTradeCapUsdc: "500000",
  dailyCapUsdc: "1000000",
  maxLossPerMarketUsdc: "1000000",
  maxDrawdownUsdc: "1000000",
  stopAtSec: 1_900_000_000,
  allowedMarketIds: ["3"],
  allowedShapes: ["binary", "curve", "range"],
  notes: "",
};
const candidate = {
  marketId: "3",
  shape: { kind: "binary" as const, threshold: "146", side: "above" as const, precision: 0 },
  spendUsdc: "500000",
  rationale: "test",
  ruleRefs: [],
};

test("shapes compile through the @kizashi/core mirrors of Shapes.sol", () => {
  const one = 10n ** 18n;
  expect(unitShape(snapshot, candidate.shape)).toEqual(step(16, 8, one));
  expect(unitShape(snapshot, { ...candidate.shape, side: "below" })).toEqual(range(16, 0, 8, one));
  expect(unitShape(snapshot, { kind: "range", from: "134", to: "140", precision: 0 })).toEqual(
    range(16, 2, 5, one),
  );
  expect(unitShape(snapshot, { kind: "curve", mean: "146", width: "6", precision: 0 })).toEqual(
    gaussianShape({ n: 16, lo: 130n, w: 2n }, 146n, 6n),
  );
  expect(() => unitShape(snapshot, { ...candidate.shape, threshold: "147" })).toThrow();
});

async function compiled(chainSkewWad = 0n) {
  const arc = fakeArc({ chainSkewWad });
  const { market } = await readPool(arc, "3", OWNER, 100n);
  const context = arcContext([market]);
  const trade = await compileCandidate({ arc, context, candidate, candidateIndex: 0 });
  return { trade: compiledTradeSchema.parse(trade), context };
}

test("compiled delta is the budget-sized unit shape and the calldata encodes it", async () => {
  const { trade } = await compiled();
  const s = poolState();
  const unit = step(16, 8, 10n ** 18n);
  const size = maxSizeForBudget(s.q, s.b, unit, toWad(500_000n));
  expect(trade.payoutWad).toEqual(unit.map((u) => mulDown(u, size).toString()));
  expect(BigInt(trade.limitUsdc)).toBeLessThanOrEqual(500_000n);
  expect(BigInt(trade.limitUsdc)).toBeGreaterThanOrEqual(BigInt(trade.chargeUsdc));
  const call = decodeFunctionData({ abi: poolAbi, data: trade.call.data as `0x${string}` });
  expect(call.functionName).toBe("trade");
  const [encoded] = call.args ?? [];
  expect((encoded as bigint[]).map(String)).toEqual(trade.payoutWad);
  expect(trade.call.to).toBe(POOL);
});

test("a matching chain quote passes risk; a drifted chain quote is quote_drift, not a crash", async () => {
  const ok = await compiled();
  expect(evaluateTrade({ candidate, trade: ok.trade, context: ok.context, rules })).toMatchObject({
    passed: true,
  });
  const drifted = await compiled(10n ** 17n);
  const verdict = evaluateTrade({
    candidate,
    trade: drifted.trade,
    context: drifted.context,
    rules,
  });
  expect(verdict.passed).toBe(false);
  expect(verdict.reasons).toContain("quote_drift");
});

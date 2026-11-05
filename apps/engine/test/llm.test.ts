import { expect, test } from "bun:test";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { createRulesExtractor, planWithModel } from "../src/services/llm";

test("planner retries invalid JSON once and validates the fake model response", async () => {
  const model = new FakeListChatModel({
    responses: ["invalid", '{"action":"hold","rationale":"No trade"}'],
  });
  const result = await planWithModel(model, "Confirmed rules and context.");
  expect(result.error).toBeNull();
  expect(result.plan.action).toBe("hold");
});

test("planner falls back to hold after two invalid responses", async () => {
  const model = new FakeListChatModel({ responses: ["invalid", "invalid"] });
  const result = await planWithModel(model, "Confirmed rules and context.");
  expect(result.error).toBe("plan_invalid");
  expect(result.plan.action).toBe("hold");
});

test("structured rules extraction retries and validates the fake model output", async () => {
  const rules = {
    budgetUsdc: "10000000",
    perTradeCapUsdc: "1000000",
    dailyCapUsdc: "2000000",
    maxLossPerMarketUsdc: "3000000",
    maxDrawdownUsdc: "4000000",
    stopAtSec: 2000000000,
    allowedMarketIds: ["market-a"],
    allowedShapes: ["binary" as const],
    notes: "",
  };
  const model = new FakeListChatModel({ responses: ["invalid", JSON.stringify(rules)] });
  expect(await createRulesExtractor(model)("Rules document text.")).toEqual(rules);
});

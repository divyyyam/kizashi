import { expect, test } from "bun:test";
import { Command, MemorySaver } from "@langchain/langgraph";
import { createEngineGraph } from "../src/graph/build";
import { rulesHash } from "../src/services/rules-hash";

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

test("confirmation interrupts again after an edit and resumes with its new hash", async () => {
  const checkpointer = new MemorySaver();
  const graph = createEngineGraph(checkpointer);
  const config = { configurable: { thread_id: crypto.randomUUID() } };
  await graph.invoke({ ruleSet: rules, source: "json", warnings: [] }, config);
  expect((await graph.getState(config)).next).toContain("confirmRules");
  const edited = { ...rules, budgetUsdc: "11000000" };
  await graph.invoke(
    new Command({ resume: { v: 1, kind: "confirmRules", rulesHash: rulesHash(rules), edited } }),
    config,
  );
  const resumed = createEngineGraph(checkpointer);
  expect((await resumed.getState(config)).values.ruleSet).toEqual(edited);
  await resumed.invoke(
    new Command({ resume: { v: 1, kind: "confirmRules", rulesHash: rulesHash(edited) } }),
    config,
  );
  expect((await resumed.getState(config)).values.rulesConfirmed).toBe(true);
});

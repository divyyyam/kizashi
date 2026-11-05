import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { type BaseCheckpointSaver, END, START, StateGraph } from "@langchain/langgraph";
import { nodeStubs } from "./nodes/stubs";
import { createPlannerNode } from "./planner";
import {
  fixedEdges,
  routeApproval,
  routeGate,
  routePlan,
  routeRisk,
  routeRules,
  routeSelect,
  routeStart,
  routeTransaction,
} from "./routes";
import { confirmRules, ingestRules } from "./rules";
import { engineState } from "./state";

export function createNoopGraph(checkpointer: BaseCheckpointSaver) {
  return new StateGraph(engineState).addEdge(START, END).compile({ checkpointer });
}

export function createEngineGraph(
  checkpointer: BaseCheckpointSaver,
  options: { model?: BaseChatModel; nodes?: Partial<typeof nodeStubs> } = {},
) {
  const nodes = { ...nodeStubs, ingestRules, confirmRules, ...options.nodes };
  if (options.model) nodes.plan = createPlannerNode(options.model);
  const builder = new StateGraph(engineState)
    .addNode("ingestRules", nodes.ingestRules)
    .addNode("confirmRules", nodes.confirmRules)
    .addNode("loadContext", nodes.loadContext)
    .addNode("gate", nodes.gate)
    .addNode("planTick", nodes.plan)
    .addNode("revise", (state) => ({ revisions: state.revisions + 1 }))
    .addNode("compile", nodes.compile)
    .addNode("risk", nodes.risk)
    .addNode("select", nodes.select)
    .addNode("publishProposal", nodes.publishProposal)
    .addNode("suggestApproval", nodes.suggestApproval)
    .addNode("awaitUserTx", nodes.awaitUserTx)
    .addNode("execute", nodes.execute)
    .addNode("confirm", nodes.confirm)
    .addNode("record", nodes.record);
  for (const [from, to] of fixedEdges) builder.addEdge(from, to);
  return builder
    .addConditionalEdges(START, routeStart, ["ingestRules", "loadContext"])
    .addConditionalEdges("confirmRules", routeRules, [END, "confirmRules"])
    .addConditionalEdges("gate", routeGate, { record: "record", plan: "planTick" })
    .addConditionalEdges("planTick", routePlan, ["record", "compile"])
    .addConditionalEdges("risk", routeRisk, {
      select: "select",
      plan: "revise",
      record: "record",
    })
    .addConditionalEdges("select", routeSelect, ["publishProposal", "execute"])
    .addConditionalEdges("suggestApproval", routeApproval, ["awaitUserTx", "compile", "record"])
    .addConditionalEdges("awaitUserTx", routeTransaction, ["confirm", "record"])
    .addConditionalEdges("execute", routeTransaction, ["confirm", "record"])
    .addEdge("revise", "planTick")
    .compile({ checkpointer });
}

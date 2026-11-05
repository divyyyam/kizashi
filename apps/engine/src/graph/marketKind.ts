import {
  type MarketKindRequest,
  type MarketKindSuggestion,
  marketKindRequestSchema,
  marketKindResponseSchema,
} from "@kizashi/schemas/engine";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { createMarketKindSuggester } from "../services/llm";

const marketKindState = Annotation.Root({
  request: Annotation<MarketKindRequest>(),
  suggestion: Annotation<MarketKindSuggestion>(),
});

export function createMarketKindGraph(model: BaseChatModel, timeoutMs?: number) {
  const suggest = createMarketKindSuggester(model, timeoutMs);
  return new StateGraph(marketKindState)
    .addNode("suggestKind", async (state) => ({
      suggestion: await suggest(marketKindRequestSchema.parse(state.request)),
    }))
    .addEdge(START, "suggestKind")
    .addEdge("suggestKind", END)
    .compile();
}

export function createMarketKindService(model: BaseChatModel) {
  const graph = createMarketKindGraph(model);
  return async (request: MarketKindRequest) => {
    const state = await graph.invoke({ request });
    return marketKindResponseSchema.parse({ v: 1, ...state.suggestion });
  };
}

export type MarketKindService = ReturnType<typeof createMarketKindService>;

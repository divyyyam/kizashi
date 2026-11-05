import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { planWithModel } from "../services/llm";
import { plannerInput } from "../services/planner-input";
import type { EngineNode } from "./nodes/stubs";

export function createPlannerNode(model: BaseChatModel): EngineNode {
  return async (state) => {
    const result = await planWithModel(model, plannerInput(state));
    return {
      plan: result.plan,
      ...(result.error
        ? {
            errors: [
              {
                code: result.error,
                message: result.plan.rationale,
                retryable: result.error === "llm_unavailable",
                node: "plan" as const,
              },
            ],
          }
        : {}),
    };
  };
}

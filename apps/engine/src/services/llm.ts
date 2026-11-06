import {
  type MarketKindRequest,
  marketKindSuggestionSchema,
  planOutputSchema,
  ruleSetSchema,
} from "@kizashi/schemas/engine";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { type BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { EngineServiceError } from "../errors";
import extractRulesPrompt from "../graph/prompts/extract-rules.system.md" with { type: "text" };
import marketKindPrompt from "../graph/prompts/marketKind.system.md" with { type: "text" };
import planPrompt from "../graph/prompts/plan.system.md" with { type: "text" };
import { modelSchema } from "./model-schema";

const MODEL_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 250;
type ModelInvoker<T> = {
  invoke(messages: BaseMessage[], options: { signal: AbortSignal }): Promise<T>;
};
type PlanOutput = z.infer<typeof planOutputSchema>;
type PlannerResult = { plan: PlanOutput; error: "plan_invalid" | "llm_unavailable" | null };

async function invokeWithDeadline<T>(
  model: ModelInvoker<T>,
  messages: BaseMessage[],
  timeoutMs = MODEL_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Model request timed out."));
    }, timeoutMs);
  });
  try {
    return await Promise.race([model.invoke(messages, { signal: controller.signal }), deadline]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function planWithModel(model: BaseChatModel, input: string): Promise<PlannerResult> {
  let feedback = "";
  let error: PlannerResult["error"] = "llm_unavailable";
  const structured = model.withStructuredOutput(modelSchema(planOutputSchema), {
    name: "createPlan",
  });
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    try {
      const plan = await invokeWithDeadline(structured, [
        new SystemMessage(planPrompt),
        new HumanMessage(`${input}${feedback}`),
      ]);
      return { plan: planOutputSchema.parse(plan), error: null };
    } catch (cause) {
      error =
        cause instanceof SyntaxError || cause instanceof z.ZodError
          ? "plan_invalid"
          : "llm_unavailable";
      feedback =
        cause instanceof z.ZodError
          ? `\nValidation failed: ${cause.issues
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; ")}`
          : error === "plan_invalid"
            ? "\nValidation failed: invalid JSON."
            : "";
    }
  }
  return {
    plan: { action: "hold", rationale: "The planner could not produce a valid plan." },
    error,
  };
}

export function createGeminiModel(apiKey: string, model: string) {
  return new ChatGoogleGenerativeAI({ apiKey, model, maxRetries: 0 });
}

export function createMarketKindSuggester(model: BaseChatModel, timeoutMs = MODEL_TIMEOUT_MS) {
  const structured = model.withStructuredOutput(modelSchema(marketKindSuggestionSchema), {
    name: "marketKind",
  });
  return async (input: MarketKindRequest) => {
    let feedback = "";
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      try {
        const result = await invokeWithDeadline(
          structured,
          [
            new SystemMessage(marketKindPrompt),
            new HumanMessage(`${JSON.stringify(input)}${feedback}`),
          ],
          timeoutMs,
        );
        return marketKindSuggestionSchema.parse(result);
      } catch (error) {
        feedback =
          error instanceof z.ZodError
            ? `\nValidation failed: ${error.issues.map((issue) => issue.message).join("; ")}`
            : "";
      }
    }
    throw new EngineServiceError(
      "llm_unavailable",
      "The market kind suggester is unavailable.",
      503,
    );
  };
}

export function createRulesExtractor(model: BaseChatModel) {
  const structured = model.withStructuredOutput(modelSchema(ruleSetSchema), {
    name: "extractRules",
  });
  return async (text: string) => {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("Rules extraction timed out."));
        }, MODEL_TIMEOUT_MS);
      });
      try {
        const result = await Promise.race([
          structured.invoke([new SystemMessage(extractRulesPrompt), new HumanMessage(text)], {
            signal: controller.signal,
          }),
          deadline,
        ]);
        return ruleSetSchema.parse(result);
      } catch (error) {
        if (attempt === MAX_ATTEMPTS - 1) {
          throw new EngineServiceError(
            "llm_unavailable",
            "The rules extractor is unavailable.",
            503,
          );
        }
        if (!(error instanceof Error)) {
          throw new EngineServiceError(
            "llm_unavailable",
            "The rules extractor is unavailable.",
            503,
          );
        }
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    }
    throw new EngineServiceError("llm_unavailable", "The rules extractor is unavailable.", 503);
  };
}

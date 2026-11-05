import { confirmRulesResumeSchema, ruleSetSchema } from "@kizashi/schemas/engine";
import { interrupt } from "@langchain/langgraph";
import { EngineServiceError } from "../errors";
import { rulesHash } from "../services/rules-hash";
import type { EngineNode } from "./nodes/stubs";

// Upload parsing/extraction precedes the graph; checkpoints retain only validated rules.
export const ingestRules: EngineNode = async (state) => {
  const ruleSet = ruleSetSchema.parse(state.ruleSet);
  return { ruleSet, rulesHash: rulesHash(ruleSet), rulesConfirmed: false };
};

export const confirmRules: EngineNode = async (state) => {
  const hash = rulesHash(state.ruleSet);
  const reply: unknown = interrupt({
    ruleSet: state.ruleSet,
    rulesHash: hash,
    source: state.source,
    warnings: state.warnings,
  });
  const parsed = confirmRulesResumeSchema.parse(reply);
  if (parsed.rulesHash.toLowerCase() !== hash.toLowerCase()) {
    throw new EngineServiceError(
      "rules_hash_mismatch",
      "The rules have changed; review them again.",
      409,
    );
  }
  if (parsed.edited)
    return {
      ruleSet: parsed.edited,
      rulesHash: rulesHash(parsed.edited),
      rulesConfirmed: false,
    };
  return { rulesHash: hash, rulesConfirmed: true };
};

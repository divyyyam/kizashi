import type { EngineMode } from "../types";

/** What the trader has typed and chosen before pressing Run. Kept across runs. */
export type ComposerDraft = {
  readonly prompt: string;
  readonly rulesFile: File | null;
  readonly budget: string;
  readonly mode: EngineMode;
};

// The allotment the composer opens with; the trader edits it before every run.
const DEFAULT_BUDGET_USD = "20";

export const INITIAL_DRAFT: ComposerDraft = {
  prompt: "",
  rulesFile: null,
  budget: DEFAULT_BUDGET_USD,
  mode: "suggest",
};

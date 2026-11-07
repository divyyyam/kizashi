import type { CreateFormValues } from "../types";

export const CREATE_DEFAULTS: CreateFormValues = {
  question: "",
  description: "",
  category: "crypto",
  tags: "",
  kind: "binary",
  yesLabel: "Yes",
  noLabel: "No",
  unit: "",
  low: "",
  high: "",
  buckets: "10",
  closesAt: "",
  source: "manual",
  sourceName: "",
  sourceUrl: "",
  criteria: "",
  edgeCases: "",
  subsidy: "10",
};

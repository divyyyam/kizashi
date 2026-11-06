import { modelCopy } from "@/content/model-copy";

export const MODE_LABELS = {
  suggest: modelCopy.mode.suggest,
  auto: modelCopy.mode.auto,
} as const;
export const MODE_HELP = {
  suggest: modelCopy.mode.suggestHelp,
  auto: modelCopy.mode.autoHelp,
} as const;

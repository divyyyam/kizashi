import { ruleSetSchema } from "@kizashi/schemas/engine";
import { workspaceCopy } from "@/content/model-workspace-copy";

const MAX_JSON_BYTES = 64 * 1024;
const MAX_PDF_BYTES = 2 * 1024 * 1024;
export async function validateRulesFile(file: File): Promise<string | null> {
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (!file.size || (extension !== "json" && extension !== "pdf"))
    return workspaceCopy.invalidRules;
  if (file.size > (extension === "json" ? MAX_JSON_BYTES : MAX_PDF_BYTES))
    return workspaceCopy.invalidRules;
  if (extension === "json") {
    try {
      if (!ruleSetSchema.safeParse(JSON.parse(await file.text())).success)
        return workspaceCopy.invalidJson;
    } catch {
      return workspaceCopy.invalidJson;
    }
  }
  return null;
}

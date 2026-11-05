import { type RuleSet, ruleSetSchema } from "@kizashi/schemas/engine";
import { extractText, getDocumentProxy } from "unpdf";
import { EngineServiceError } from "../errors";

const JSON_LIMIT_BYTES = 64 * 1024;
const PDF_LIMIT_BYTES = 2 * 1024 * 1024;
const PDF_PAGE_LIMIT = 20;
const PDF_IMAGE_LIMIT_PIXELS = 16_777_216;

type PdfExtractor = (text: string) => Promise<RuleSet>;
type RulesUpload = { bytes: Uint8Array; mediaType: string; extractPdf: PdfExtractor };

function invalidRules(): never {
  throw new EngineServiceError("rules_invalid", "The uploaded rules are invalid.", 400);
}

async function readPdf(bytes: Uint8Array): Promise<string> {
  try {
    const document = await getDocumentProxy(bytes, { maxImageSize: PDF_IMAGE_LIMIT_PIXELS });
    try {
      if (document.numPages > PDF_PAGE_LIMIT) {
        throw new EngineServiceError("upload_too_large", "The PDF exceeds 20 pages.", 413);
      }
      return (await extractText(document, { mergePages: true })).text;
    } finally {
      await document.loadingTask.destroy();
    }
  } catch (error) {
    if (error instanceof EngineServiceError) throw error;
    return invalidRules();
  }
}

export async function parseRulesUpload({ bytes, mediaType, extractPdf }: RulesUpload) {
  if (mediaType === "application/json") {
    if (bytes.byteLength > JSON_LIMIT_BYTES) {
      throw new EngineServiceError("upload_too_large", "The JSON rules exceed 64 KB.", 413);
    }
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return { rules: ruleSetSchema.parse(JSON.parse(text)), source: "json" as const };
    } catch {
      return invalidRules();
    }
  }
  if (mediaType === "application/pdf") {
    if (bytes.byteLength > PDF_LIMIT_BYTES) {
      throw new EngineServiceError("upload_too_large", "The PDF exceeds 2 MB.", 413);
    }
    const text = await readPdf(bytes);
    const result = ruleSetSchema.safeParse(await extractPdf(text));
    if (!result.success) return invalidRules();
    return { rules: result.data, source: "pdf" as const };
  }
  throw new EngineServiceError("unsupported_file", "Upload JSON or PDF rules.", 415);
}

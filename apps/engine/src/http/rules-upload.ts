import { createRunResponseSchema, uploadRulesEndpointRequestSchema } from "@kizashi/schemas/engine";
import { Router } from "express";
import multer from "multer";
import { EngineServiceError } from "../errors";
import type { RulesRuns } from "../services/rules-runs";
import { parseRulesUpload } from "../services/rules-upload";
import { perUserRateLimit } from "./rate-limit";
import { authenticatedPrincipal } from "./require-auth";
import { validate } from "./validate";

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const JSON_LIMIT_BYTES = 64 * 1024;
const PDF_LIMIT_BYTES = 2 * 1024 * 1024;
export type PdfExtractor = Parameters<typeof parseRulesUpload>[0]["extractPdf"];

export function rulesUploadRouter(rules?: RulesRuns, extractPdf?: PdfExtractor) {
  const router = Router();
  if (!rules || !extractPdf)
    return router.post("/", () => {
      throw new EngineServiceError("internal", "Rule-based run creation is unavailable.", 503);
    });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: PDF_LIMIT_BYTES,
      files: 1,
      fields: 4,
      parts: 5,
      fieldSize: JSON_LIMIT_BYTES,
    },
  });
  router.post(
    "/",
    perUserRateLimit(10, HOUR_MS),
    perUserRateLimit(5, MINUTE_MS),
    upload.single("rules"),
    validate(uploadRulesEndpointRequestSchema, async ({ input, request, response }) => {
      if (!request.file) throw new EngineServiceError("bad_request", "Upload a rules file.", 400);
      const parsed = await parseRulesUpload({
        bytes: request.file.buffer,
        mediaType: request.file.mimetype,
        extractPdf,
      });
      const result = await rules.start({
        principal: authenticatedPrincipal(response),
        mode: input.body.mode,
        vault: input.body.vault ?? null,
        prompt: input.body.prompt,
        rules: parsed.rules,
        source: parsed.source,
      });
      response.status(201).json(createRunResponseSchema.parse(result));
    }),
  );
  return router;
}

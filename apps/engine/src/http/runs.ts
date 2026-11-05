import {
  readRunEndpointRequestSchema,
  resumeEndpointRequestSchema,
  resumeRunResponseSchema,
  runResponseSchema,
} from "@kizashi/schemas/engine";
import { Router } from "express";
import { EngineServiceError } from "../errors";
import type { RulesRuns } from "../services/rules-runs";
import type { RunService } from "../services/runs";
import type { TickCoordinator } from "../services/tick-coordinator";
import { authenticatedPrincipal } from "./require-auth";
import { type PdfExtractor, rulesUploadRouter } from "./rules-upload";
import { validate } from "./validate";

export function runsRouter(
  runs: RunService,
  options: {
    rules?: RulesRuns | undefined;
    extractPdf?: PdfExtractor | undefined;
    ticks?: TickCoordinator | undefined;
  } = {},
) {
  const { rules, extractPdf, ticks } = options;
  const router = Router();
  router.use(rulesUploadRouter(rules, extractPdf));
  router.get(
    "/:id",
    validate(readRunEndpointRequestSchema, async ({ input, response }) => {
      const principal = authenticatedPrincipal(response);
      const result = await (rules ?? runs).read(input.params.id, principal);
      const pending =
        ticks && !result.pending ? await ticks.pending(input.params.id, principal) : result.pending;
      response.json(runResponseSchema.parse({ ...result, pending }));
    }),
  );
  router.post(
    "/:id/resume",
    validate(resumeEndpointRequestSchema, async ({ input, response }) => {
      if (!rules)
        throw new EngineServiceError("internal", "Rules confirmation is unavailable.", 503);
      const principal = authenticatedPrincipal(response);
      const result =
        input.body.kind === "confirmRules"
          ? await rules.resume(input.params.id, principal, input.body)
          : ticks
            ? await ticks.resume(input.params.id, principal, input.body)
            : await unavailableResume(rules, input.params.id, principal);
      response.json(resumeRunResponseSchema.parse(result));
    }),
  );
  return router;
}

async function unavailableResume(
  rules: RulesRuns,
  id: string,
  principal: Parameters<RulesRuns["read"]>[1],
) {
  await rules.read(id, principal);
  throw new EngineServiceError(
    "vault_unavailable",
    "The engine market adapters are not configured.",
    503,
  );
}

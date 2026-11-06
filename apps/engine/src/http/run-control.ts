import {
  type EngineErrorCode,
  modeEndpointRequestSchema,
  modeResponseSchema,
  stopResponseSchema,
  tickEndpointRequestSchema,
  tickResponseSchema,
} from "@kizashi/schemas/engine";
import { Router } from "express";
import { EngineServiceError } from "../errors";
import type { RunControl } from "../services/run-control";
import type { TickCoordinator } from "../services/tick-coordinator";
import { authenticatedPrincipal } from "./require-auth";
import { validate } from "./validate";

export function runControlRouter(
  control?: RunControl,
  ticks?: TickCoordinator,
  unavailable: { code: EngineErrorCode; message: string } = {
    code: "vault_unavailable",
    message: "The engine market adapters are not configured.",
  },
) {
  const router = Router();
  router.post(
    "/:id/tick",
    validate(tickEndpointRequestSchema, async ({ input, response }) => {
      const principal = authenticatedPrincipal(response);
      if (control) await control.owned(input.params.id, principal);
      if (!ticks) throw new EngineServiceError(unavailable.code, unavailable.message, 503);
      response.json(tickResponseSchema.parse(await ticks.tick(input.params.id, principal)));
    }),
  );
  router.post(
    "/:id/mode",
    validate(modeEndpointRequestSchema, async ({ input, response }) => {
      if (!control) throw new EngineServiceError("internal", "Run controls are unavailable.", 503);
      response.json(
        modeResponseSchema.parse(
          await control.mode(input.params.id, authenticatedPrincipal(response), input.body.mode),
        ),
      );
    }),
  );
  router.post(
    "/:id/stop",
    validate(tickEndpointRequestSchema, async ({ input, response }) => {
      if (!control) throw new EngineServiceError("internal", "Run controls are unavailable.", 503);
      response.json(
        stopResponseSchema.parse(
          await control.stop(input.params.id, authenticatedPrincipal(response)),
        ),
      );
    }),
  );
  return router;
}

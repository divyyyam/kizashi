import { marketKindEndpointRequestSchema, marketKindResponseSchema } from "@kizashi/schemas/engine";
import { Router } from "express";
import { EngineServiceError } from "../errors";
import type { MarketKindService } from "../graph/marketKind";
import { validate } from "./validate";

export function marketKindRouter(suggest?: MarketKindService) {
  const router = Router();
  router.post(
    "/",
    validate(marketKindEndpointRequestSchema, async ({ input, response }) => {
      if (!suggest)
        throw new EngineServiceError(
          "llm_unavailable",
          "The market kind suggester is not configured.",
          503,
        );
      response.json(marketKindResponseSchema.parse(await suggest(input.body)));
    }),
  );
  return router;
}

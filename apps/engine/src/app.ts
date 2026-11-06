import {
  type EngineErrorCode,
  emptyEndpointRequestSchema,
  healthResponseSchema,
} from "@kizashi/schemas/engine";
import cors from "cors";
import express from "express";
import type { Logger } from "pino";
import { EngineServiceError } from "./errors";
import type { MarketKindService } from "./graph/marketKind";
import { authRouter } from "./http/auth";
import { errorHandler } from "./http/error-handler";
import { marketKindRouter } from "./http/market-kind";
import { perUserRateLimit } from "./http/rate-limit";
import { requestLog } from "./http/request-log";
import { requireAuth } from "./http/require-auth";
import { runControlRouter } from "./http/run-control";
import { runsRouter } from "./http/runs";
import { streamRouter } from "./http/stream";
import { validate } from "./http/validate";
import type { AuthService } from "./services/auth";
import type { RulesRuns } from "./services/rules-runs";
import type { parseRulesUpload } from "./services/rules-upload";
import type { RunControl } from "./services/run-control";
import type { RunEvents } from "./services/run-events";
import type { RunService } from "./services/runs";
import type { TickCoordinator } from "./services/tick-coordinator";
import type { TokenService } from "./services/tokens";

type AppOptions = {
  auth: AuthService;
  tokens: TokenService;
  runs: RunService;
  origins: readonly string[];
  chainId: number;
  version: string;
  logger: Logger;
  rules?: RulesRuns;
  control?: RunControl;
  ticks?: TickCoordinator;
  ticksUnavailable?: { code: EngineErrorCode; message: string };
  events?: RunEvents;
  extractPdf?: Parameters<typeof parseRulesUpload>[0]["extractPdf"];
  suggestMarketKind?: MarketKindService;
};

export function createApp(options: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  // Behind one reverse proxy (Nginx on EC2): use its X-Forwarded-For for client IPs and rate limits.
  app.set("trust proxy", 1);
  app.use(requestLog(options.logger));
  app.use(
    cors({
      credentials: false,
      origin(origin, callback) {
        if (!origin || options.origins.includes(origin)) callback(null, true);
        else
          callback(
            new EngineServiceError("forbidden", "This origin cannot access the engine.", 403),
          );
      },
    }),
  );
  app.use(express.json({ limit: "64kb" }));
  app.get(
    "/health",
    validate(emptyEndpointRequestSchema, ({ response }) => {
      response.json(
        healthResponseSchema.parse({
          ok: true,
          version: options.version,
          chainId: options.chainId,
        }),
      );
    }),
  );
  app.use("/auth", authRouter(options.auth));
  app.use(requireAuth(options.tokens, options.chainId));
  app.use("/runs", runControlRouter(options.control, options.ticks, options.ticksUnavailable));
  app.use("/runs", streamRouter(options.control, options.events));
  app.use(
    "/runs",
    runsRouter(options.runs, {
      rules: options.rules,
      extractPdf: options.extractPdf,
      ticks: options.ticks,
    }),
  );
  app.use(
    "/market-kind",
    perUserRateLimit(30, 60 * 60 * 1000),
    marketKindRouter(options.suggestMarketKind),
  );
  app.use(() => {
    throw new EngineServiceError("not_found", "The engine route was not found.", 404);
  });
  app.use(errorHandler(options.logger));
  return app;
}

import type { EngineEnvironment } from "../env";
import { EngineServiceError } from "../errors";
import { createEngineGraph, createNoopGraph } from "../graph/build";
import { createMarketKindService } from "../graph/marketKind";
import { createAuthService } from "./auth";
import { createGeminiModel, createRulesExtractor } from "./llm";
import { createRulesRuns } from "./rules-runs";
import { createRulesStore } from "./rules-store";
import { createRunControl } from "./run-control";
import { createRunEvents } from "./run-events";
import { createRunService } from "./runs";
import type { RuntimeStorage } from "./runtime-storage";
import { createNonceStore, createRunStore } from "./storage";
import { createTokenService } from "./tokens";
import { createTradingRuntime, type TradingAdapters } from "./trading-runtime";

export function runtimeServices(options: {
  storage: RuntimeStorage;
  settings: EngineEnvironment;
  adapters?: TradingAdapters;
}) {
  const {
    storage: { database, checkpoints },
    settings,
    adapters,
  } = options;
  const model = settings.GOOGLE_GENERATIVE_AI_API_KEY
    ? createGeminiModel(settings.GOOGLE_GENERATIVE_AI_API_KEY, settings.ENGINE_GEMINI_MODEL)
    : undefined;
  const tokens = createTokenService(settings.ENGINE_JWT_SECRET);
  const auth = createAuthService({
    nonces: createNonceStore(database),
    tokens,
    domain: settings.ENGINE_SIWE_DOMAIN,
    origins: settings.ENGINE_ALLOWED_ORIGINS,
    chainId: settings.NEXT_PUBLIC_CHAIN_ID,
  });
  const trading =
    adapters && model
      ? createTradingRuntime({
          database,
          pool: checkpoints.pool,
          checkpointer: checkpoints.saver,
          adapters,
          model,
        })
      : undefined;
  const graph = trading?.graph ?? createEngineGraph(checkpoints.saver, model ? { model } : {});
  const runs = createRunService({
    store: createRunStore(database),
    graph: createNoopGraph(checkpoints.saver),
  });
  const events = createRunEvents(database);
  const control = createRunControl(database, events);
  const rules = createRulesRuns(createRulesStore(database), graph, events);
  const extractPdf = model
    ? createRulesExtractor(model)
    : async () => {
        throw new EngineServiceError(
          "llm_unavailable",
          "The rules extractor is not configured.",
          503,
        );
      };
  return {
    graph,
    runs,
    events,
    control,
    rules,
    auth,
    tokens,
    extractPdf,
    ...(model ? { suggestMarketKind: createMarketKindService(model) } : {}),
    ...(trading ? { ticks: trading.ticks } : {}),
  };
}

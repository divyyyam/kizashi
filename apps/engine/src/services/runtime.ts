import type { Logger } from "pino";
import { createApp } from "../app";
import type { EngineEnvironment } from "../env";
import { runtimeServices } from "./runtime-services";
import { openRuntimeStorage } from "./runtime-storage";
import type { TradingAdapters } from "./trading-runtime";

export async function createRuntime(
  settings: EngineEnvironment,
  logger: Logger,
  adapters?: TradingAdapters,
) {
  const storage = await openRuntimeStorage(settings, logger);
  try {
    const services = runtimeServices({ storage, settings, ...(adapters ? { adapters } : {}) });
    const app = createApp({
      ...services,
      logger,
      origins: settings.ENGINE_ALLOWED_ORIGINS,
      chainId: settings.NEXT_PUBLIC_CHAIN_ID,
      version: "0.1.0",
    });
    return {
      app,
      ...services,
      ...storage,
      close: async () => {
        await Promise.all([storage.database.$disconnect(), storage.checkpoints.close()]);
      },
    };
  } catch (error) {
    await Promise.all([storage.database.$disconnect(), storage.checkpoints.close()]);
    throw error;
  }
}

import { createDatabase, directDatabaseUrl } from "@kizashi/db";
import type { Logger } from "pino";
import type { EngineEnvironment } from "../env";
import { createCheckpointStore } from "./checkpoints";
import { databaseOperation } from "./storage";

export async function openRuntimeStorage(settings: EngineEnvironment, logger: Logger) {
  const database = createDatabase(
    settings.DATABASE_URL,
    () => logger.warn({ code: "database_connection_lost" }, "Database pool will reconnect"),
    settings.ENGINE_DB_SCHEMA,
  );
  try {
    await databaseOperation(() => database.$connect());
    const checkpoints = await createCheckpointStore(
      directDatabaseUrl(settings.DATABASE_URL),
      logger,
      settings.ENGINE_CHECKPOINT_SCHEMA,
    );
    return { database, checkpoints };
  } catch (error) {
    await database.$disconnect();
    throw error;
  }
}
export type RuntimeStorage = Awaited<ReturnType<typeof openRuntimeStorage>>;

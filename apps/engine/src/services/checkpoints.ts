import {
  checkpointSchema,
  DATABASE_IDLE_TIMEOUT_MS,
  DATABASE_POOL_SIZE,
  DATABASE_TIMEOUT_MS,
} from "@kizashi/db";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { Pool } from "pg";
import type { Logger } from "pino";
import { EngineServiceError } from "../errors";

export async function createCheckpointStore(
  directUrl: string,
  logger: Logger,
  schema = checkpointSchema(),
) {
  const pool = new Pool({
    connectionString: directUrl,
    max: DATABASE_POOL_SIZE,
    connectionTimeoutMillis: DATABASE_TIMEOUT_MS,
    query_timeout: DATABASE_TIMEOUT_MS,
    statement_timeout: DATABASE_TIMEOUT_MS,
    idleTimeoutMillis: DATABASE_IDLE_TIMEOUT_MS,
  });
  pool.on("error", () =>
    logger.warn({ code: "checkpoint_connection_lost" }, "Checkpoint pool will reconnect"),
  );
  const saver = new PostgresSaver(pool, undefined, { schema });
  try {
    await saver.setup();
  } catch {
    await pool.end();
    throw new EngineServiceError("internal", "The engine checkpoint store could not start.", 503);
  }
  return { saver, pool, close: () => pool.end() };
}

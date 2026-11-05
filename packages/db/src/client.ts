import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../node_modules/.prisma/engine/client";
import {
  DATABASE_IDLE_TIMEOUT_MS,
  DATABASE_POOL_SIZE,
  DATABASE_TIMEOUT_MS,
  engineSchema,
  scopedDatabaseUrl,
} from "./settings";

export function createDatabase(
  connectionString: string,
  onConnectionFailure: () => void,
  schema = engineSchema(),
) {
  const adapter = new PrismaPg(
    {
      connectionString: scopedDatabaseUrl(connectionString, schema),
      connectionTimeoutMillis: DATABASE_TIMEOUT_MS,
      idleTimeoutMillis: DATABASE_IDLE_TIMEOUT_MS,
      query_timeout: DATABASE_TIMEOUT_MS,
      max: DATABASE_POOL_SIZE,
    },
    {
      schema,
      onPoolError: onConnectionFailure,
      onConnectionError: onConnectionFailure,
    },
  );
  return new PrismaClient({
    adapter,
    transactionOptions: { maxWait: DATABASE_TIMEOUT_MS, timeout: DATABASE_TIMEOUT_MS },
  });
}

export type EngineDatabase = ReturnType<typeof createDatabase>;

export const ENGINE_DEV_SCHEMA = "engine_dev_e0e1";
export const CHECKPOINT_DEV_SCHEMA = "engine_checkpoints_dev_e0e1";
export const DATABASE_TIMEOUT_MS = 10_000;
export const DATABASE_POOL_SIZE = 5;
export const DATABASE_IDLE_TIMEOUT_MS = 30_000;

export function schemaName(value: string | undefined, fallback: string) {
  const result = value ?? fallback;
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(result)) {
    throw new Error("Database schema names must be lowercase PostgreSQL identifiers.");
  }
  return result;
}

export function engineSchema(value = process.env.ENGINE_DB_SCHEMA) {
  if (process.env.NODE_ENV === "production" && !value) {
    throw new Error("Production requires ENGINE_DB_SCHEMA.");
  }
  return schemaName(value, ENGINE_DEV_SCHEMA);
}

export function checkpointSchema(value = process.env.ENGINE_CHECKPOINT_SCHEMA) {
  if (process.env.NODE_ENV === "production" && !value) {
    throw new Error("Production requires ENGINE_CHECKPOINT_SCHEMA.");
  }
  return schemaName(value, CHECKPOINT_DEV_SCHEMA);
}

function postgresUrl(connectionString: string) {
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("A PostgreSQL connection is required.");
  }
  if (url.searchParams.get("sslmode") !== "require") {
    throw new Error("Database connections must require TLS.");
  }
  return url;
}

export function scopedDatabaseUrl(connectionString: string, schema = engineSchema()) {
  const url = postgresUrl(connectionString);
  url.searchParams.set("schema", schemaName(schema, ENGINE_DEV_SCHEMA));
  return url.toString();
}

export function directDatabaseUrl(connectionString: string) {
  const url = postgresUrl(connectionString);
  // Prisma documents identical credentials for these two endpoints.
  if (url.hostname === "pooled.db.prisma.io") url.hostname = "db.prisma.io";
  return url.toString();
}

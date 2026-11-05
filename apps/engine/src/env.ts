import { CHECKPOINT_DEV_SCHEMA, ENGINE_DEV_SCHEMA } from "@kizashi/db";
import { z } from "zod";

const DEFAULT_PORT = 8787;
const LOCAL_CHAIN_ID = 31337;
const MINIMUM_JWT_SECRET_BYTES = 32;
const originSchema = z.url().refine((value) => new URL(value).origin === value);
const postgresSchema = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return (
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      url.searchParams.get("sslmode") === "require"
    );
  } catch {
    return false;
  }
}, "A PostgreSQL connection requiring TLS is required.");

const envSchema = z.object({
  DATABASE_URL: postgresSchema,
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  ENGINE_GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),
  ENGINE_DB_SCHEMA: z
    .string()
    .regex(/^[a-z_][a-z0-9_]{0,62}$/)
    .default(ENGINE_DEV_SCHEMA),
  ENGINE_CHECKPOINT_SCHEMA: z
    .string()
    .regex(/^[a-z_][a-z0-9_]{0,62}$/)
    .default(CHECKPOINT_DEV_SCHEMA),
  ENGINE_JWT_SECRET: z
    .string()
    .refine((value) => new TextEncoder().encode(value).length >= MINIMUM_JWT_SECRET_BYTES),
  ENGINE_ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) => value.split(",").map((origin) => origin.trim()))
    .pipe(z.array(originSchema).min(1)),
  ENGINE_SIWE_DOMAIN: z.string().default("localhost:3000"),
  NEXT_PUBLIC_CHAIN_ID: z.coerce.number().int().positive().default(LOCAL_CHAIN_ID),
  PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_PORT),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export function readEnvironment(input: Record<string, string | undefined> = process.env) {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Missing or invalid engine environment settings: ${names.join(", ")}.`);
  }
  const settings = result.data;
  if (
    settings.NODE_ENV === "production" &&
    (!input.ENGINE_DB_SCHEMA || !input.ENGINE_CHECKPOINT_SCHEMA)
  ) {
    throw new Error("Production requires explicit engine database schema names.");
  }
  if (settings.ENGINE_DB_SCHEMA === settings.ENGINE_CHECKPOINT_SCHEMA) {
    throw new Error("Engine and checkpoint schemas must be distinct.");
  }
  if (
    !settings.ENGINE_ALLOWED_ORIGINS.some(
      (origin) => new URL(origin).host === settings.ENGINE_SIWE_DOMAIN,
    )
  ) {
    throw new Error("The SIWE domain must match an allowed web origin.");
  }
  return settings;
}

export type EngineEnvironment = ReturnType<typeof readEnvironment>;

import { isHex } from "viem";
import { z } from "zod";

const hexKeySchema = z
  .string()
  .refine((val): val is `0x${string}` => isHex(val) && val.length === 66, {
    message: "Invalid private key format",
  });

const envSchema = z.object({
  ARC_TESTNET_RPC_URL: z.string().min(1),
  ARKIV_RPC_URL: z.string().min(1),
  INDEXER_ARKIV_PRIVATE_KEY: hexKeySchema,
  LISTING_ARKIV_PRIVATE_KEY: hexKeySchema,
  INDEXER_POLL_MS: z.coerce.number().int().positive().default(10000),
  INDEXER_SNAPSHOT_MIN_SEC: z.coerce.number().int().positive().default(60),
  ARC_CHAIN_ID: z.coerce.number().int().positive().default(5042002),
});

export type IndexerEnv = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, string | undefined> = process.env): IndexerEnv {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const missing = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Missing or invalid environment variable: ${missing.join(", ")}`);
  }
  return result.data;
}

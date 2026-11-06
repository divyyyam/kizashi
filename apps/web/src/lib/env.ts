import { z } from "zod";

const ARC_TESTNET_CHAIN_ID = 5042002;
const ANVIL_CHAIN_ID = 31337;
const SUPPORTED_CHAIN_IDS: readonly number[] = [ARC_TESTNET_CHAIN_ID, ANVIL_CHAIN_ID];

const envSchema = z.object({
  NEXT_PUBLIC_CHAIN_ID: z.coerce
    .number()
    .int()
    .refine((id) => SUPPORTED_CHAIN_IDS.includes(id), {
      message: `must be ${ARC_TESTNET_CHAIN_ID} (Arc testnet) or ${ANVIL_CHAIN_ID} (anvil)`,
    }),
  NEXT_PUBLIC_ARC_RPC_URL: z.url(),
  // Optional until Divyam supplies one: without it the wallet list is browser (injected) wallets only.
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().min(1).optional(),
});

export type WebEnv = z.infer<typeof envSchema>;

function parseEnv(): WebEnv {
  // Literal property access so Next.js inlines NEXT_PUBLIC_* values into the client bundle.
  const result = envSchema.safeParse({
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_ARC_RPC_URL: process.env.NEXT_PUBLIC_ARC_RPC_URL,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || undefined,
  });
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid web environment (see .env.example):\n${issues}`);
  }
  return result.data;
}

export const env = parseEnv();

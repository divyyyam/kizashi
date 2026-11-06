import { readFileSync } from "node:fs";
import { type Address, createPublicClient, getAddress, http, type PublicClient } from "viem";
import { z } from "zod";

const RPC_TIMEOUT_MS = 10_000;
const deploymentsSchema = z.record(
  z.string(),
  z.object({ address: z.string(), block: z.number().int() }),
);

export type ArcDeployments = { factory: Address; usdc: Address };

/** Addresses come from contracts/deployments/<chainId>.json, the deploy script's output. */
export function readDeployments(chainId: number, root: URL): ArcDeployments {
  const file = new URL(`contracts/deployments/${chainId}.json`, root);
  const parsed = deploymentsSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  const pick = (name: string) => {
    const entry = parsed[name];
    if (!entry) throw new Error(`Deployment ${name} is missing for chain ${chainId}.`);
    return getAddress(entry.address);
  };
  return { factory: pick("KizashiMarketFactory"), usdc: pick("USDC") };
}

/** Reads are idempotent: bounded timeout, up to three retries with exponential backoff. */
export function createArcClient(rpcUrl: string): PublicClient {
  return createPublicClient({
    transport: http(rpcUrl, { timeout: RPC_TIMEOUT_MS, retryCount: 3, retryDelay: 250 }),
  });
}

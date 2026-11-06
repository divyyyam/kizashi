import { arcTestnet } from "@kizashi/contracts";
import { createPublicClient, http } from "viem";

/** Server-side Arc reader. Reads are idempotent, so up to 3 retries with backoff. */
export function arcReader() {
  const url =
    process.env.ARC_TESTNET_RPC_URL?.trim() || process.env.NEXT_PUBLIC_ARC_RPC_URL?.trim();
  if (!url) throw new Error("ARC_TESTNET_RPC_URL is not set");
  return createPublicClient({
    chain: arcTestnet,
    transport: http(url, { timeout: 15_000, retryCount: 3 }),
  });
}

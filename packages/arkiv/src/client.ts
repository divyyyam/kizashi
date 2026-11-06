import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { type Account, http, webSocket } from "viem";
import { ARKIV_TESTNET, arkivChain } from "./chain";

/**
 * Client factories. No key is read here: readers get an RPC URL (a server proxy in the browser, or
 * the keyed upstream on a server), writers also get their own viem `Account`. Each writer (engine,
 * indexer, listing service per D10) uses its own wallet.
 */

export const DEFAULT_TIMEOUT_MS = 10_000;

export type ArkivReaderConfig = {
  rpcUrl: string;
  wsUrl?: string | undefined;
  timeoutMs?: number | undefined;
};

export type ArkivWriterConfig = ArkivReaderConfig & { account: Account };

export function createArkivReader(config: ArkivReaderConfig) {
  return createPublicClient({
    chain: arkivChain(config.rpcUrl, config.wsUrl),
    // Reads are idempotent: up to 3 retries with viem's exponential backoff.
    transport: http(config.rpcUrl, {
      timeout: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      retryCount: 3,
    }),
  });
}

/** Live client over WebSocket for subscriptions; falls back to the caller if no wsUrl is set. */
export function createArkivSubscriber(config: ArkivReaderConfig & { wsUrl: string }) {
  return createPublicClient({
    chain: arkivChain(config.rpcUrl, config.wsUrl),
    transport: webSocket(config.wsUrl, { timeout: config.timeoutMs ?? DEFAULT_TIMEOUT_MS }),
  });
}

export function createArkivWriter(config: ArkivWriterConfig) {
  return createWalletClient({
    chain: arkivChain(config.rpcUrl, config.wsUrl),
    account: config.account,
    // Writes are not retried: a resend could double-create an entity.
    transport: http(config.rpcUrl, {
      timeout: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      retryCount: 0,
    }),
  });
}

export type ArkivReader = ReturnType<typeof createArkivReader>;
export type ArkivWriter = ReturnType<typeof createArkivWriter>;

/** Server-side endpoint config, from an env object the caller passes in (never process.env here). */
export type ArkivEnv = Readonly<Record<string, unknown>>;

function envString(env: ArkivEnv, key: string): string | undefined {
  const value = env[key];
  return typeof value === "string" ? value.trim() : undefined;
}

export type ArkivConfigResult =
  | { status: "ready"; config: ArkivReaderConfig }
  | { status: "unavailable"; reason: string };

export function arkivConfigFromEnv(env: ArkivEnv): ArkivConfigResult {
  const rpcUrl = envString(env, "ARKIV_RPC_URL");
  if (!rpcUrl) return { status: "unavailable", reason: "ARKIV_RPC_URL is not set" };
  if (!/^https:\/\//.test(rpcUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(rpcUrl)) {
    return { status: "unavailable", reason: "ARKIV_RPC_URL must be https" };
  }
  const chainId = envString(env, "ARKIV_CHAIN_ID");
  if (chainId && Number(chainId) !== ARKIV_TESTNET.chainId) {
    return {
      status: "unavailable",
      reason: `ARKIV_CHAIN_ID ${chainId} is not the Arkiv testnet (${ARKIV_TESTNET.chainId})`,
    };
  }
  const wsUrl = envString(env, "ARKIV_WS_URL");
  return { status: "ready", config: { rpcUrl, wsUrl: wsUrl || undefined } };
}

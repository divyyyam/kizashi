import { type Chain, defineChain } from "viem";

/**
 * Arkiv testnet (Rabdi). Constants match `rabdi()` in @arkiv-network/sdk 1.0.1
 * (src/chains/rabdi.ts). We define the chain here instead of calling `rabdi()` so the RPC URL can be
 * a server proxy (no access key in the browser) and so no access key is ever baked into a chain
 * object that a wallet might be asked to add.
 */
export const ARKIV_TESTNET = {
  chainId: 7794095,
  name: "Rabdi",
  rpcHost: "rpc.rabdi.db-chain.testnet.arkiv.network",
  explorer: "https://rabdi.explorer.arkiv.network",
  faucet: "https://hub.arkiv.network/faucet",
  accessKeys: "https://hub.arkiv.network/access-keys",
} as const;

/** Nominal block time the SDK uses for every seconds-to-blocks conversion (consts.ts BLOCK_TIME). */
export const ARKIV_BLOCK_TIME_SEC = 2;

/** Builds the full upstream URL for an access key. Server-side only: the key is in the path. */
export function arkivRpcUrl(accessKey: string, protocol: "https" | "wss" = "https"): string {
  const path = accessKey === "" ? "" : `/${encodeURIComponent(accessKey)}`;
  return `${protocol}://${ARKIV_TESTNET.rpcHost}${path}`;
}

/** A viem chain for Arkiv with caller-supplied endpoints (a proxy path, or the keyed upstream). */
export function arkivChain(rpcUrl: string, wsUrl?: string): Chain {
  return defineChain({
    id: ARKIV_TESTNET.chainId,
    name: ARKIV_TESTNET.name,
    nativeCurrency: { name: "Golem", symbol: "tGLM", decimals: 18 },
    rpcUrls: {
      default: wsUrl === undefined ? { http: [rpcUrl] } : { http: [rpcUrl], webSocket: [wsUrl] },
    },
    blockExplorers: { default: { name: "Rabdi Explorer", url: ARKIV_TESTNET.explorer } },
    testnet: true,
  });
}

export function explorerEntityUrl(entityKey: string): string {
  return `${ARKIV_TESTNET.explorer}/entity/${entityKey}`;
}

export function explorerTxUrl(txHash: string): string {
  return `${ARKIV_TESTNET.explorer}/tx/${txHash}`;
}

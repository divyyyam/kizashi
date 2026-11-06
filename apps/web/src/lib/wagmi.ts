import { anvil, arcTestnet, chainById } from "@kizashi/contracts";
import {
  type Config,
  type CreateConnectorFn,
  cookieStorage,
  createConfig,
  createStorage,
  http,
} from "wagmi";
import { env } from "@/lib/env";

const chain = chainById(env.NEXT_PUBLIC_CHAIN_ID);
if (chain === undefined) {
  throw new Error(`No chain definition for NEXT_PUBLIC_CHAIN_ID ${env.NEXT_PUBLIC_CHAIN_ID}`);
}
export const appChain = chain;

/**
 * Server-safe wagmi config. The server passes no connectors (it only reads the wallet cookie for
 * hydration); the client providers pass RainbowKit's connectors. Chains, storage and transports
 * are identical on both sides, so the cookie state matches.
 */
export function createWagmiConfig(connectors: CreateConnectorFn[] = []): Config {
  return createConfig({
    chains: [appChain],
    connectors,
    ssr: true,
    storage: createStorage({ storage: cookieStorage }),
    transports: {
      [arcTestnet.id]: http(env.NEXT_PUBLIC_ARC_RPC_URL),
      [anvil.id]: http(),
    },
  });
}

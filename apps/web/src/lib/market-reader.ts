import { arcTestnet, chainById } from "@kizashi/contracts";
import { createPublicClient, http } from "viem";
import { env } from "./env";
import { createRpcRateGuard } from "./rpc-rate-guard";

const chain = chainById(env.NEXT_PUBLIC_CHAIN_ID);
if (!chain) throw new Error(`No public reader for chain ${env.NEXT_PUBLIC_CHAIN_ID}`);

/** Market discovery does not need a connected wallet or the wallet UI bundle. */
export const marketReader = createPublicClient({
  chain,
  transport: http(chain.id === arcTestnet.id ? env.NEXT_PUBLIC_ARC_RPC_URL : undefined, {
    timeout: 10_000,
    retryCount: 0,
    ...createRpcRateGuard(),
  }),
});

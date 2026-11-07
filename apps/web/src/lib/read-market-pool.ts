import { kizashiPoolAbi } from "@kizashi/contracts";
import type { Address, PublicClient } from "viem";
import type { PoolSnapshot } from "./market-summary";
import { RequestFailure } from "./request";
import { validateMarketSnapshot } from "./validate-market";

export async function readMarketPool(
  client: PublicClient,
  pool: Address,
  blockNumber?: bigint,
): Promise<PoolSnapshot | null> {
  const [config, state, closeTime, liquidity, prices] = await Promise.all([
    client.readContract({
      address: pool,
      abi: kizashiPoolAbi,
      functionName: "config",
      blockNumber,
    }),
    client.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "state", blockNumber }),
    client.readContract({
      address: pool,
      abi: kizashiPoolAbi,
      functionName: "closeTime",
      blockNumber,
    }),
    client.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "b", blockNumber }),
    client.readContract({
      address: pool,
      abi: kizashiPoolAbi,
      functionName: "prices",
      blockNumber,
    }),
  ]);
  if (state === 0) return null;
  if (state > 3 || !Number.isSafeInteger(Number(closeTime))) throw new RequestFailure("invalid");
  validateMarketSnapshot({ count: Number(config.n), width: config.w, liquidity, prices });
  return {
    n: Number(config.n),
    lo: config.lo,
    w: config.w,
    state,
    closeTimeSec: Number(closeTime),
    bWad: liquidity,
    pricesWad: prices,
  };
}

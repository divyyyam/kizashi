import { factoryAddress, kizashiMarketFactoryAbi, kizashiPoolAbi } from "@kizashi/contracts";
import { type PublicClient, zeroAddress } from "viem";
import { marketSummary } from "@/lib/market-summary";
import { readFinalization } from "@/lib/read-finalization";
import { readMarketListing } from "@/lib/read-market-listing";
import { readMarketPool } from "@/lib/read-market-pool";
import { validateMarketSnapshot } from "@/lib/validate-market";
import type { MarketDetail } from "../types";

export async function fetchMarketDetail(
  client: PublicClient,
  marketId: string,
  chainId: number,
  arkivWriter?: string,
): Promise<MarketDetail | "not_found" | "unsupported"> {
  const factory = factoryAddress(chainId);
  if (!factory) return "unsupported";
  if (!/^[1-9]\d*$/.test(marketId)) return "not_found";
  const id = BigInt(marketId);
  const pool = await client.readContract({
    address: factory,
    abi: kizashiMarketFactoryAbi,
    functionName: "poolOf",
    args: [id],
  });
  if (pool === zeroAddress) return "not_found";
  const reverse = await client.readContract({
    address: factory,
    abi: kizashiMarketFactoryAbi,
    functionName: "marketOf",
    args: [pool],
  });
  if (reverse !== id) return "not_found";
  const block = await client.getBlock({ blockTag: "latest" });
  const [raw, q] = await Promise.all([
    readMarketPool(client, pool, block.number),
    client.readContract({
      address: pool,
      abi: kizashiPoolAbi,
      functionName: "q",
      blockNumber: block.number,
    }),
  ]);
  if (!raw) return "not_found";
  validateMarketSnapshot({
    count: raw.n,
    width: raw.w,
    liquidity: raw.bWad,
    prices: raw.pricesWad,
    quantities: q,
  });
  const [resolution, listing] = await Promise.all([
    raw.state === 3
      ? readFinalization(client, { chainId, poolAddress: pool, marketId })
      : undefined,
    readMarketListing({ writer: arkivWriter, chainId, marketId, poolAddress: pool }),
  ]);
  return {
    ...marketSummary({ chainId, marketId, poolAddress: pool, raw, listing }),
    bWad: raw.bWad,
    qWad: q,
    blockNumber: block.number,
    blockHash: block.hash,
    ...resolution,
  };
}

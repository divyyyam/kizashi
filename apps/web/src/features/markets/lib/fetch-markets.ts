import { createArkivReader, type MarketListing, openMarkets } from "@kizashi/arkiv";
import { factoryAddress, kizashiMarketFactoryAbi } from "@kizashi/contracts";
import { type Address, getAddress, isAddress, type PublicClient, zeroAddress } from "viem";
import { marketSummary } from "@/lib/market-summary";
import { readMarketPool } from "@/lib/read-market-pool";
import { boundedRead } from "@/lib/request";
import type { MarketSummary } from "../types";

const MARKET_READ_CONCURRENCY = 2;
const LISTING_TIMEOUT_MS = 5_000;
type ReadOptions = { arkivWriter?: string | undefined; signal?: AbortSignal | undefined };

async function fetchListings(input: ReadOptions & { chainId: number }): Promise<MarketListing[]> {
  if (!input.arkivWriter || !isAddress(input.arkivWriter)) return [];
  const owner = getAddress(input.arkivWriter);
  try {
    const reader = createArkivReader({ rpcUrl: "/api/arkiv" });
    const page = await boundedRead(
      () => openMarkets(reader, { owner, arcChainId: input.chainId }),
      { signal: input.signal, timeoutMs: LISTING_TIMEOUT_MS },
    );
    return page.items;
  } catch {
    // Descriptions are optional. Verified chain state remains usable without Arkiv.
    input.signal?.throwIfAborted();
    return [];
  }
}

async function readVerifiedMarket(
  client: PublicClient,
  input: { factory: Address; id: bigint; signal: AbortSignal | undefined },
) {
  const { factory, id, signal } = input;
  signal?.throwIfAborted();
  const pool = await client.readContract({
    address: factory,
    abi: kizashiMarketFactoryAbi,
    functionName: "poolOf",
    args: [id],
  });
  if (pool === zeroAddress) return undefined;
  signal?.throwIfAborted();
  const reverseId = await client.readContract({
    address: factory,
    abi: kizashiMarketFactoryAbi,
    functionName: "marketOf",
    args: [pool],
  });
  if (reverseId !== id) return undefined;
  signal?.throwIfAborted();
  const raw = await readMarketPool(client, pool);
  return raw ? { marketId: String(id), pool, raw } : undefined;
}

async function readMarkets(
  client: PublicClient,
  input: { factory: Address; count: bigint; signal: AbortSignal | undefined },
) {
  const markets: NonNullable<Awaited<ReturnType<typeof readVerifiedMarket>>>[] = [];
  for (let start = 1n; start <= input.count; start += BigInt(MARKET_READ_CONCURRENCY)) {
    input.signal?.throwIfAborted();
    const ids = Array.from(
      { length: MARKET_READ_CONCURRENCY },
      (_, offset) => start + BigInt(offset),
    ).filter((id) => id <= input.count);
    const batch = await Promise.all(ids.map((id) => readVerifiedMarket(client, { ...input, id })));
    for (const market of batch) if (market) markets.push(market);
  }
  return markets;
}

export async function fetchMarkets(
  client: PublicClient,
  chainId: number,
  options: ReadOptions = {},
): Promise<MarketSummary[] | null> {
  const factory = factoryAddress(chainId);
  if (!factory) return null;
  options.signal?.throwIfAborted();
  const count = await client.readContract({
    address: factory,
    abi: kizashiMarketFactoryAbi,
    functionName: "marketCount",
  });
  if (count === 0n) return [];
  const [markets, listings] = await Promise.all([
    readMarkets(client, { factory, count, signal: options.signal }),
    fetchListings({ ...options, chainId }),
  ]);
  options.signal?.throwIfAborted();
  const listingById = new Map(listings.map((listing) => [listing.marketId, listing]));
  return markets.map(({ marketId, pool, raw }) => {
    const listing = listingById.get(marketId);
    return marketSummary({
      chainId,
      marketId,
      poolAddress: pool,
      raw,
      listing: listing?.arcAddress.toLowerCase() === pool.toLowerCase() ? listing : undefined,
    });
  });
}

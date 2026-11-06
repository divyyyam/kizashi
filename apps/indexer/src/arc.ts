import {
  arcTestnet,
  kizashiMarketFactoryAbi,
  kizashiPoolAbi,
  kizashiResolverAbi,
} from "@kizashi/contracts";
import type { Address, PublicClient } from "viem";
import { createPublicClient, getAddress, http, parseEventLogs } from "viem";

export const MAX_BLOCK_CHUNK = 5000n;

export type MarketCreatedRecord = {
  marketId: string;
  pool: Address;
  creator: Address;
  blockNumber: bigint;
};

export type PoolEventRecord = {
  eventName: "Traded" | "Resolved" | "Closed";
  poolAddress: Address;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
};

export type FinalizedRecord = {
  marketId: string;
  bucket: bigint;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
};

export type ArcLogsResult = {
  marketCreated: MarketCreatedRecord[];
  poolEvents: PoolEventRecord[];
  finalizedEvents: FinalizedRecord[];
  toBlock: bigint;
};

export type PoolCurveData = {
  b: bigint;
  q: readonly bigint[];
  prices: readonly bigint[];
  timestampSec: number;
  poolState: number;
};

export function createArcClient(rpcUrl: string, retryCount = 3, timeout = 15_000): PublicClient {
  return createPublicClient({
    chain: arcTestnet,
    transport: http(rpcUrl, { retryCount, timeout, retryDelay: 1000 }),
  });
}

export async function fetchFactoryCreated(
  client: PublicClient,
  factoryAddress: Address,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<MarketCreatedRecord[]> {
  const logs = await client.getLogs({
    address: factoryAddress,
    fromBlock,
    toBlock,
  });
  const parsed = parseEventLogs({
    abi: kizashiMarketFactoryAbi,
    eventName: "MarketCreated",
    logs,
  });
  return parsed.map((e) => ({
    marketId: e.args.marketId.toString(),
    pool: getAddress(e.args.pool),
    creator: getAddress(e.args.creator),
    blockNumber: e.blockNumber,
  }));
}

export async function fetchPoolEvents(
  client: PublicClient,
  pools: Address[],
  fromBlock: bigint,
  toBlock: bigint,
): Promise<PoolEventRecord[]> {
  if (pools.length === 0) return [];
  const logs = await client.getLogs({
    address: pools,
    fromBlock,
    toBlock,
  });
  const parsed = parseEventLogs({
    abi: kizashiPoolAbi,
    logs,
  });
  const results: PoolEventRecord[] = [];
  for (const e of parsed) {
    if (e.eventName === "Traded" || e.eventName === "Resolved" || e.eventName === "Closed") {
      results.push({
        eventName: e.eventName,
        poolAddress: getAddress(e.address),
        blockNumber: e.blockNumber,
        transactionHash: e.transactionHash,
      });
    }
  }
  return results;
}

export async function fetchResolverFinalized(
  client: PublicClient,
  resolverAddress: Address,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<FinalizedRecord[]> {
  const logs = await client.getLogs({
    address: resolverAddress,
    fromBlock,
    toBlock,
  });
  const parsed = parseEventLogs({
    abi: kizashiResolverAbi,
    eventName: "Finalized",
    logs,
  });
  return parsed.map((e) => ({
    marketId: e.args.marketId.toString(),
    bucket: e.args.bucket,
    blockNumber: e.blockNumber,
    transactionHash: e.transactionHash,
  }));
}

export async function fetchPoolCurveData(
  client: PublicClient,
  poolAddress: Address,
  blockNumber: bigint,
): Promise<PoolCurveData> {
  const at = { blockNumber };
  const poolState = await client.readContract({
    address: poolAddress,
    abi: kizashiPoolAbi,
    functionName: "state",
    ...at,
  });

  if (poolState !== 1) {
    return {
      b: 0n,
      q: [],
      prices: [],
      timestampSec: 0,
      poolState: Number(poolState),
    };
  }

  const [b, q, prices, block] = await Promise.all([
    client.readContract({
      address: poolAddress,
      abi: kizashiPoolAbi,
      functionName: "b",
      ...at,
    }),
    client.readContract({
      address: poolAddress,
      abi: kizashiPoolAbi,
      functionName: "q",
      ...at,
    }),
    client.readContract({
      address: poolAddress,
      abi: kizashiPoolAbi,
      functionName: "prices",
      ...at,
    }),
    client.getBlock({ blockNumber }),
  ]);

  return {
    b: BigInt(b),
    q: q.map((v) => BigInt(v)),
    prices: prices.map((v) => BigInt(v)),
    timestampSec: Number(block.timestamp),
    poolState: Number(poolState),
  };
}

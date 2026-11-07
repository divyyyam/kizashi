import { kizashiPoolAbi } from "@kizashi/contracts";
import type { Address, PublicClient } from "viem";
import { copy } from "@/content/copy";
import type { MarketSummary } from "@/features/markets";
import { readFinalization } from "@/lib/read-finalization";
import { RequestFailure, requestMessage } from "@/lib/request";
import { readTicketHistory } from "@/lib/ticket-history";
import type { PortfolioPosition } from "../types";

export async function fetchPortfolioPositions(
  client: PublicClient,
  owner: Address,
  input: { markets: readonly MarketSummary[]; chainId: number; signal?: AbortSignal },
): Promise<PortfolioPosition[]> {
  const { markets, chainId, signal } = input;
  signal?.throwIfAborted();
  if (markets.length === 0) return [];
  const block = await client.getBlock({ blockTag: "latest" });
  if (block.number === null || block.hash === null) throw new RequestFailure("invalid");
  const positions: PortfolioPosition[] = [];
  for (const market of markets) {
    signal?.throwIfAborted();
    const position = await readPosition(client, {
      market,
      owner,
      chainId,
      block: { number: block.number, hash: block.hash },
    });
    if (position) positions.push(position);
  }
  return positions;
}

async function readPosition(
  client: PublicClient,
  input: {
    market: MarketSummary;
    owner: Address;
    chainId: number;
    block: { number: bigint; hash: `0x${string}` };
  },
): Promise<PortfolioPosition | undefined> {
  const { market: m, owner, chainId, block } = input;
  if (!m.poolAddress) return undefined;
  const posWad = await client.readContract({
    address: m.poolAddress,
    abi: kizashiPoolAbi,
    functionName: "positionOf",
    args: [owner],
    blockNumber: block.number,
  });
  if (posWad.length !== m.grid.n) throw new RequestFailure("invalid");

  const hasPosition = posWad.some((val) => val !== 0n);
  let winningBucket: number | undefined;
  let finalized: PortfolioPosition["finalized"];
  let canRedeem = false;

  if (m.status === "resolved") {
    const resolution = await readFinalization(client, {
      chainId,
      poolAddress: m.poolAddress,
      marketId: m.marketId,
    });
    winningBucket = resolution.winningBucket;
    finalized = resolution.finalized;
    canRedeem = (posWad[winningBucket] ?? 0n) > 0n;
  }

  if (hasPosition || canRedeem) {
    return {
      ...m,
      poolAddress: m.poolAddress,
      owner,
      positionWad: posWad,
      history: await readTicketHistory({
        client,
        chainId,
        marketId: m.marketId,
        pool: m.poolAddress,
        owner,
        position: posWad,
        block: block.number,
        hash: block.hash,
      }).catch((error) => ({
        status: "unavailable" as const,
        reason: requestMessage(error, copy.market.historyUnavailable),
      })),
      lifecycle: "active",
      blockNumber: block.number,
      blockHash: block.hash,
      winningBucket,
      finalized,
      canRedeem,
    };
  }
  return undefined;
}

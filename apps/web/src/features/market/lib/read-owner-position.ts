import { kizashiPoolAbi } from "@kizashi/contracts";
import type { Address, PublicClient } from "viem";
import { boundedRead, RequestFailure } from "@/lib/request";
import type { MarketDetail, OwnerPosition } from "../types";

export async function readOwnerPosition(input: {
  client: PublicClient | undefined;
  market: MarketDetail;
  owner: Address | undefined;
  signal: AbortSignal;
}): Promise<Omit<OwnerPosition, "history" | "historyFeedback">> {
  const { client, market, owner, signal } = input;
  const pool = market.poolAddress;
  if (!client || !pool || !owner) throw new RequestFailure("service");
  const positionWad = await boundedRead(
    () =>
      client.readContract({
        address: pool,
        abi: kizashiPoolAbi,
        functionName: "positionOf",
        args: [owner],
        blockNumber: market.blockNumber,
      }),
    { signal },
  );
  if (positionWad.length !== market.grid.n) throw new RequestFailure("invalid");
  return {
    chainId: market.chainId,
    marketId: market.marketId,
    owner,
    positionWad,
    blockNumber: market.blockNumber,
    blockHash: market.blockHash,
  };
}

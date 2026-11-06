import { DEPLOYMENT_5042002, kizashiPoolAbi, resolverAddress } from "@kizashi/contracts";
import type { Address, PublicClient } from "viem";
import { parseAbiItem } from "viem";
import { copy } from "@/content/copy";
import { fetchMarkets } from "@/features/markets/lib/fetch-markets";
import type { PortfolioPosition } from "../types";
import { fetchTicketHistory } from "./ticket-history";

export async function fetchPortfolioPositions(
  client: PublicClient,
  owner: Address,
  chainId: number,
  arkivWriter?: string,
): Promise<PortfolioPosition[]> {
  const markets = await fetchMarkets(client, chainId, arkivWriter);
  if (!markets || markets.length === 0) return [];

  const block = await client.getBlock({ blockTag: "latest" });
  const positions: PortfolioPosition[] = [];
  const resolver = resolverAddress(chainId);
  const finalizedEvent = parseAbiItem(
    "event Finalized(uint256 indexed marketId, uint256 bucket, uint8 path)",
  );

  for (const m of markets) {
    if (!m.poolAddress) continue;
    try {
      const posWad = await client.readContract({
        address: m.poolAddress,
        abi: kizashiPoolAbi,
        functionName: "positionOf",
        args: [owner],
      });

      const hasPosition = posWad.some((val) => val !== 0n);
      let winningBucket: number | undefined;
      let finalized: PortfolioPosition["finalized"];
      let canRedeem = false;

      if (m.status === "resolved") {
        const wb = await client.readContract({
          address: m.poolAddress,
          abi: kizashiPoolAbi,
          functionName: "winningBucket",
        });
        winningBucket = Number(wb);
        const payout = posWad[winningBucket];
        if (payout !== undefined && payout > 0n) {
          canRedeem = true;
        }

        if (resolver) {
          try {
            const logs = await client.getLogs({
              address: resolver,
              event: finalizedEvent,
              args: { marketId: BigInt(m.marketId) },
              fromBlock: DEPLOYMENT_5042002.resolver.block,
            });
            if (logs.length > 0 && logs[0]) {
              finalized = {
                bucket: Number(logs[0].args.bucket),
                path: Number(logs[0].args.path),
                transactionHash: logs[0].transactionHash,
              };
            }
          } catch {
            // Rate limit resilience
          }
        }
      }

      if (hasPosition || canRedeem) {
        positions.push({
          chainId: m.chainId,
          marketId: m.marketId,
          poolAddress: m.poolAddress,
          question: m.question,
          kind: m.kind,
          grid: m.grid,
          unit: m.unit,
          precision: m.precision,
          status: m.status,
          owner,
          positionWad: posWad,
          history: hasPosition
            ? await fetchTicketHistory(
                client,
                m.poolAddress,
                owner,
                DEPLOYMENT_5042002.markets[m.marketId]?.block,
                posWad,
                block.number,
              )
            : { status: "unavailable", reason: copy.market.historyUnavailable },
          lifecycle: "active",
          blockNumber: block.number,
          blockHash: block.hash,
          winningBucket,
          finalized,
          canRedeem,
        });
      }
    } catch {
      // Continue next market
    }
  }

  return positions;
}

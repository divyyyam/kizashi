import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
export type MarketDocument = { text: string; swarmReference: string; gatewayUrl: string };
export function useMarketDocument(_input: {
  chainId: number;
  marketId: string;
  kind: "rules" | "evidence";
}): DataState<MarketDocument> {
  return { status: "unavailable", reason: copy.market.documentUnavailable };
}

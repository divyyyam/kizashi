"use client";

import { useQuery } from "@tanstack/react-query";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { queryResult } from "@/lib/query-result";
import { RequestFailure, requestJson } from "@/lib/request";
import { type MarketMetaView, metadataResponseSchema } from "./metadata-response";

export type { MarketMetaView } from "./metadata-response";

/** Market metadata from /api/markets/:id/metadata (Arkiv → IPFS → hash checked against Arc). */
export function useMarketMetadata(marketId: string | undefined): DataState<MarketMetaView> {
  const query = useQuery({
    queryKey: ["market-metadata", marketId],
    enabled: Boolean(marketId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const body = await requestJson({
        url: `/api/markets/${encodeURIComponent(marketId ?? "")}/metadata`,
        schema: metadataResponseSchema,
        signal,
      });
      if (body.status === "error") throw new RequestFailure("service");
      return body;
    },
  });
  if (!marketId) return { status: "empty" };
  const result = queryResult(query, copy.feedback.metadata.error);
  if (result.status !== "ready") return result;
  if (result.data.status === "ready") return { ...result, data: result.data.data };
  if (result.data.status === "empty") return { ...result, status: "empty" };
  return { ...result, status: "unavailable", reason: copy.feedback.metadata.unavailable };
}

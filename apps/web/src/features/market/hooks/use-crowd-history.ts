"use client";

import { useQuery } from "@tanstack/react-query";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { queryResult } from "@/lib/query-result";
import { isRateLimited, RequestFailure, requestJson } from "@/lib/request";
import { type CrowdPoint, type CrowdResponse, crowdResponseSchema } from "../lib/crowd-response";

export type { CrowdPoint } from "../lib/crowd-response";

/** Top-outcome probability over time, from Arkiv curve snapshots via /api/markets/:id/crowd-history. */
export function useCrowdHistory(marketId: string): DataState<readonly CrowdPoint[]> {
  const query = useQuery<CrowdResponse>({
    queryKey: ["crowd-history", marketId],
    refetchInterval: (query) => (isRateLimited(query.state.error) ? false : 30_000),
    queryFn: async ({ signal }) => {
      const body = await requestJson({
        url: `/api/markets/${encodeURIComponent(marketId)}/crowd-history`,
        schema: crowdResponseSchema,
        signal,
      });
      if (body.status === "error") throw new RequestFailure("service");
      return body;
    },
  });
  const result = queryResult(query, copy.feedback.history.error);
  if (result.status !== "ready") return result;
  if (result.data.status === "ready")
    return { ...result, data: [...result.data.points].sort((a, b) => a.tsSec - b.tsSec) };
  if (result.data.status === "empty") return { ...result, status: "empty" };
  return { ...result, status: "unavailable", reason: copy.feedback.history.unavailable };
}

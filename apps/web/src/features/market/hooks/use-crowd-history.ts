"use client";

import { useQuery } from "@tanstack/react-query";
import type { DataState } from "@/lib/data-state";

export type CrowdPoint = {
  entityKey: string;
  tsSec: number;
  topBucket: number;
  topProbabilityPpm: number;
};

type Body =
  | { status: "ready"; points: CrowdPoint[] }
  | { status: "empty" }
  | { status: "unavailable"; reason: string }
  | { status: "error"; message: string };

/** Top-outcome probability over time, from Arkiv curve snapshots via /api/markets/:id/crowd-history. */
export function useCrowdHistory(marketId: string): DataState<readonly CrowdPoint[]> {
  const query = useQuery({
    queryKey: ["crowd-history", marketId],
    refetchInterval: 30_000,
    queryFn: async (): Promise<Body> => {
      const res = await fetch(`/api/markets/${encodeURIComponent(marketId)}/crowd-history`);
      return (await res.json()) as Body;
    },
  });
  if (query.isPending) return { status: "loading" };
  if (query.isError) return { status: "error", message: "Crowd history could not be loaded." };
  const body = query.data;
  if (body.status === "ready") return { status: "ready", data: body.points };
  if (body.status === "empty") return { status: "empty" };
  if (body.status === "error") return { status: "error", message: body.message };
  return { status: "unavailable", reason: body.reason };
}

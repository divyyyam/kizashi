"use client";

import type { MarketMetadata } from "@kizashi/schemas/market";
import { useQuery } from "@tanstack/react-query";
import type { DataState } from "@/lib/data-state";

export type MarketMetaView = {
  metadata: MarketMetadata;
  metadataCid: string;
  metadataUrl: string;
  imageUrl: string | null;
  rulesRef: `0x${string}`;
  listing: { entityKey: string; url: string };
  verified: true;
};

type Body =
  | { status: "ready"; data: MarketMetaView }
  | { status: "empty"; reason?: string }
  | { status: "unavailable"; reason: string }
  | { status: "error"; message: string };

/** Market metadata from /api/markets/:id/metadata (Arkiv → IPFS → hash checked against Arc). */
export function useMarketMetadata(marketId: string | undefined): DataState<MarketMetaView> {
  const query = useQuery({
    queryKey: ["market-metadata", marketId],
    enabled: Boolean(marketId),
    staleTime: 60_000,
    queryFn: async (): Promise<Body> => {
      const res = await fetch(`/api/markets/${encodeURIComponent(marketId ?? "")}/metadata`);
      return (await res.json()) as Body;
    },
  });
  if (!marketId || query.isPending) return { status: "loading" };
  if (query.isError) return { status: "error", message: "Market details could not be loaded." };
  const body = query.data;
  if (body.status === "ready") return { status: "ready", data: body.data };
  if (body.status === "empty") return { status: "empty" };
  if (body.status === "error") return { status: "error", message: body.message };
  return { status: "unavailable", reason: body.reason };
}

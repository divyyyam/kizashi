"use client";

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { copy } from "@/content/copy";
import { MarketMetaPanel, useMarketMetadata } from "@/features/market-meta";
import { env } from "@/lib/env";
import { useMarket } from "../hooks/use-market";
import { ConnectedMarket } from "./ConnectedMarket";

export function MarketScreen({ marketId, chainId }: { marketId: string; chainId?: number }) {
  const result = useMarket({ marketId, chainId: chainId ?? env.NEXT_PUBLIC_CHAIN_ID });
  const meta = useMarketMetadata(marketId);
  if (result.status === "empty") notFound();
  if (result.status === "ready")
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow={copy.markets[result.data.kind]}
          title={meta.status === "ready" ? meta.data.metadata.question : result.data.question}
        />
        <MarketMetaPanel state={meta} />
        <ConnectedMarket
          key={`${result.data.chainId}:${result.data.marketId}`}
          market={result.data}
        />
      </div>
    );
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={copy.market.title} />
      <div
        role="status"
        className="rounded-md border bg-surface px-6 py-16 text-center text-text-muted"
      >
        {result.status === "error"
          ? result.message
          : result.status === "unavailable"
            ? result.reason
            : copy.market.loading}
      </div>
    </div>
  );
}

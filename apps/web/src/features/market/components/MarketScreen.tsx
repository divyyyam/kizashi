"use client";

import { notFound } from "next/navigation";
import { MarketsLink } from "@/components/feedback/MarketsLink";
import { RefreshNotice } from "@/components/feedback/RefreshNotice";
import { SectionBoundary } from "@/components/feedback/SectionBoundary";
import { StatePanel } from "@/components/feedback/StatePanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { copy } from "@/content/copy";
import { MarketMetaPanel, useMarketMetadata } from "@/features/market-meta";
import { env } from "@/lib/env";
import { useMarket } from "../hooks/use-market";
import { ConnectedMarket } from "./ConnectedMarket";
import { CrowdHistory } from "./CrowdHistory";
import { MarketSkeleton } from "./MarketSkeleton";

export function MarketScreen({ marketId, chainId }: { marketId: string; chainId?: number }) {
  const result = useMarket({ marketId, chainId: chainId ?? env.NEXT_PUBLIC_CHAIN_ID });
  const meta = useMarketMetadata(marketId);
  if (result.status === "empty") notFound();
  if (result.status === "loading") return <MarketSkeleton />;
  if (result.status === "ready")
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow={copy.markets[result.data.kind]}
          title={meta.status === "ready" ? meta.data.metadata.question : result.data.question}
        />
        <RefreshNotice {...result} />
        <ConnectedMarket
          key={`${result.data.chainId}:${result.data.marketId}`}
          market={result.data}
          readWarning={result.warning}
        />
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <SectionBoundary title={copy.feedback.metadata.title}>
            <MarketMetaPanel state={meta} />
          </SectionBoundary>
          <SectionBoundary title={copy.feedback.history.title}>
            <CrowdHistory marketId={result.data.marketId} />
          </SectionBoundary>
        </div>
      </div>
    );
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={copy.market.title} />
      <StatePanel
        kind={result.status === "error" ? "error" : "unavailable"}
        retry={result.retry}
        retryAt={result.retryAt}
        busy={result.refreshing}
        message={result.status === "error" ? result.message : result.reason}
      >
        <MarketsLink />
      </StatePanel>
    </div>
  );
}

"use client";

import { useMarketMetadata } from "./use-market-metadata";

/** Lobby card title with the market's category, when its metadata is published. */
export function MarketCardTitle({ marketId, fallback }: { marketId: string; fallback: string }) {
  const meta = useMarketMetadata(marketId);
  const ready = meta.status === "ready" ? meta.data : undefined;
  return (
    <div className="flex min-h-20 items-start gap-4">
      <div className="grid min-w-0 gap-1">
        {ready ? (
          <span className="text-label capitalize text-text-faint">{ready.metadata.category}</span>
        ) : null}
        <h2 className="line-clamp-2 min-h-12 break-words text-h3 text-text">
          {ready?.metadata.question ?? fallback}
        </h2>
      </div>
    </div>
  );
}

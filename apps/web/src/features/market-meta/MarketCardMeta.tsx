"use client";

import { useMarketMetadata } from "./use-market-metadata";

/** Lobby card title with the market's image and category, when its metadata is published. */
export function MarketCardTitle({ marketId, fallback }: { marketId: string; fallback: string }) {
  const meta = useMarketMetadata(marketId);
  const ready = meta.status === "ready" ? meta.data : undefined;
  return (
    <div className="flex items-start gap-4">
      {ready?.imageUrl ? (
        // biome-ignore lint/performance/noImgElement: IPFS gateway image
        <img
          src={ready.imageUrl}
          alt=""
          className="size-14 shrink-0 rounded-md border border-border object-cover"
        />
      ) : null}
      <div className="grid gap-1">
        {ready ? (
          <span className="text-label capitalize text-text-faint">{ready.metadata.category}</span>
        ) : null}
        <h2 className="font-display text-3xl leading-none">
          {ready?.metadata.question ?? fallback}
        </h2>
      </div>
    </div>
  );
}

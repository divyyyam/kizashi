"use client";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { copy } from "@/content/copy";
import { type MarketSummary, MiniCurve } from "@/features/markets";
import type { DataState } from "@/lib/data-state";
import { ChapterHeading } from "./ChapterHeading";

export function LiveTicker({ result }: { result: DataState<readonly MarketSummary[]> }) {
  const [paused, setPaused] = useState(false);
  const markets = result.status === "ready" ? result.data : [];
  return (
    <section id="listings" className="story-chapter ticker-chapter">
      <ChapterHeading index={3} title={copy.story.tickerTitle} body={copy.story.tickerBody} />
      {markets.length ? (
        <div className="ticker-frame" data-paused={paused}>
          <div className="ticker-belt">
            {[false, true].map((duplicate) => (
              <div
                key={String(duplicate)}
                aria-hidden={duplicate || undefined}
                inert={duplicate}
                className="ticker-strip"
              >
                {markets.map((m) => (
                  <Link
                    key={`${m.chainId}:${m.marketId}`}
                    href={`/market/${m.marketId}?chain=${m.chainId}`}
                  >
                    <MiniCurve prices={m.pricesWad} />
                    {m.question}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <button type="button" className="ink-link" onClick={() => setPaused(!paused)}>
            {paused ? copy.motion.play : copy.motion.pause}
          </button>
        </div>
      ) : (
        <div className="listing-state">
          <span className="text-label text-text-faint">{copy.story.dataSource}</span>
          <p className="text-h2">
            {result.status === "error"
              ? result.message
              : result.status === "loading"
                ? copy.markets.loading
                : result.status === "empty" || result.status === "ready"
                  ? copy.empty.markets
                  : copy.story.tickerEmpty}
          </p>
          <Link href="/markets" className="ink-link">
            {copy.story.openMarkets}
            <ArrowUpRight aria-hidden size={16} />
          </Link>
        </div>
      )}
    </section>
  );
}

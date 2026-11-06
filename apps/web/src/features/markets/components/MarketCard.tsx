import { argMax } from "@kizashi/core";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { MarketTrace } from "@/components/market/MarketTrace";
import { copy } from "@/content/copy";
import { MarketCardTitle } from "@/features/market-meta";
import { formatWad } from "@/lib/format";
import { bucketLabel } from "../lib/bucket-label";
import { closingTime } from "../lib/closing-time";
import type { MarketSummary } from "../types";
import { MiniCurve } from "./MiniCurve";

export function MarketCard({ market, nowSec }: { market: MarketSummary; nowSec: number }) {
  const clock = nowSec;
  const href = `/market/${encodeURIComponent(market.marketId)}?chain=${market.chainId}`;
  return (
    <Link
      href={href}
      className="market-card group grid min-w-0 content-between gap-7 border border-border bg-surface p-5 hover:border-border-strong md:p-6"
    >
      <div className="flex items-center justify-between text-label text-text-muted">
        <span>{copy.markets[market.kind]}</span>
        <ArrowUpRight
          aria-hidden
          size={17}
          className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
      <MarketCardTitle marketId={market.marketId} fallback={market.question} />
      <MarketTrace market={market}>
        <MiniCurve prices={market.pricesWad} />
      </MarketTrace>
      <div className="grid gap-2 border-t pt-4 text-small">
        <div className="flex justify-between gap-2">
          <span className="text-text-muted">{copy.markets.mostLikely}</span>
          <span className="tabular">{bucketLabel(market, argMax(market.pricesWad))}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-text-muted">{copy.motion.liquidity}</span>
          <span className="tabular">
            {market.bWad === undefined ? copy.market.metricUnavailable : formatWad(market.bWad)}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-text-muted">{copy.markets.closes}</span>
          <span className="tabular">
            {clock ? closingTime(market.closeTimeSec, clock) : copy.loading.page}
          </span>
        </div>
      </div>
    </Link>
  );
}

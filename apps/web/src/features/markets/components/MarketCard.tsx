import { argMax } from "@kizashi/core";
import { ArrowUpRight, ChartNoAxesColumn } from "lucide-react";
import Link from "next/link";
import { MarketTrace } from "@/components/market/MarketTrace";
import { copy } from "@/content/copy";
import { MarketCardTitle } from "@/features/market-meta";
import { bucketLabel } from "../lib/bucket-label";
import { closingTime } from "../lib/closing-time";
import type { MarketSummary } from "../types";
import { MiniCurve } from "./MiniCurve";
import "./market-card.css";

export function MarketCard({ market, nowSec }: { market: MarketSummary; nowSec: number }) {
  const href = `/market/${encodeURIComponent(market.marketId)}?chain=${market.chainId}`;
  const uniform = market.pricesWad.every((price) => price === market.pricesWad[0]);
  return (
    <Link href={href} className="market-card group">
      <div className="market-card-top">
        <div className="market-card-type">
          <span className="market-card-kind">
            <ChartNoAxesColumn size={16} aria-hidden />
            {copy.markets[market.kind]}
          </span>
          <span>{copy.markets[market.status]}</span>
        </div>
        <MarketCardTitle marketId={market.marketId} fallback={market.question} />
      </div>
      <div className="market-card-forecast">
        <span>{uniform ? copy.markets.distribution : copy.markets.mostLikely}</span>
        <strong>
          {uniform ? copy.markets.equalOutcomes : bucketLabel(market, argMax(market.pricesWad))}
        </strong>
      </div>
      <div className="market-card-chart">
        <MarketTrace market={market}>
          <MiniCurve prices={market.pricesWad} />
        </MarketTrace>
      </div>
      <div className="market-card-footer">
        <span>
          {nowSec && market.closeTimeSec > nowSec ? `${copy.markets.closes} ` : ""}
          {nowSec ? closingTime(market.closeTimeSec, nowSec) : copy.loading.page}
        </span>
        <strong>
          {copy.markets.viewMarket}
          <ArrowUpRight size={16} aria-hidden />
        </strong>
      </div>
    </Link>
  );
}

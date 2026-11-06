import { ArrowUpRight } from "lucide-react";
import { copy } from "@/content/copy";
import { txUrl } from "@/lib/explorer";
import type { MarketDetail } from "../types";

export function SettledMarketPanel({ market }: { market: MarketDetail }) {
  const finalized = market.finalized;
  const explorerLink = finalized ? txUrl(market.chainId, finalized.transactionHash) : undefined;
  const resolutionModeName = finalized?.path === 2 ? "Uniswap v4 TWAP" : "Manual Resolver";

  return (
    <section className="flex flex-col gap-5 rounded-md border bg-surface p-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-h3 font-medium">{copy.market.resolved}</h2>
        <span className="rounded bg-surface-raised px-2.5 py-1 text-label text-text-muted">
          {copy.markets.resolved}
        </span>
      </div>

      <div className="flex flex-col gap-3 text-small">
        <div className="flex justify-between gap-2">
          <span className="text-text-muted">{copy.market.finalizedEvent}</span>
          <span className="font-medium text-text">
            {finalized
              ? copy.market.finalizedMode(resolutionModeName)
              : copy.market.metricUnavailable}
          </span>
        </div>

        {(finalized?.bucket !== undefined || market.winningBucket !== undefined) && (
          <div className="flex justify-between gap-2">
            <span className="text-text-muted">{copy.portfolio.market}</span>
            <span className="tabular font-medium text-text">
              {copy.market.finalizedBucket(finalized?.bucket ?? market.winningBucket ?? 0)}
            </span>
          </div>
        )}

        {explorerLink ? (
          <div className="pt-2">
            <a
              href={explorerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-accent hover:underline"
            >
              <span>{copy.market.finalizedTx}</span>
              <ArrowUpRight size={14} aria-hidden />
            </a>
          </div>
        ) : (
          <p className="text-text-muted">{copy.market.metricUnavailable}</p>
        )}
      </div>
    </section>
  );
}

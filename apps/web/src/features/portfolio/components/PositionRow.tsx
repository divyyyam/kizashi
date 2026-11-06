import { floorOf, freed, grossCollateral, nettedCollateral } from "@kizashi/core";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { MiniCurve } from "@/features/markets";
import { txUrl } from "@/lib/explorer";
import { formatUsdc, formatWad } from "@/lib/format";
import { useRedeem } from "../hooks/use-redeem";
import type { PortfolioPosition } from "../types";

export function PositionRow({ position }: { position: PortfolioPosition }) {
  const { redeem, isRedeeming } = useRedeem(position.poolAddress, position.chainId);
  const complete = position.history.status === "complete";
  const tickets = position.history.status === "complete" ? position.history.originalTicketsWad : [];

  const finalizedUrl = position.finalized
    ? txUrl(position.chainId, position.finalized.transactionHash)
    : undefined;

  const fields = [
    [copy.portfolio.kind, copy.markets[position.kind]],
    [copy.portfolio.floor, formatWad(floorOf(position.positionWad))],
    [
      copy.portfolio.gross,
      complete ? formatWad(grossCollateral(tickets)) : copy.portfolio.metricUnavailable,
    ],
    [
      copy.portfolio.netted,
      complete ? formatWad(nettedCollateral(tickets)) : copy.portfolio.metricUnavailable,
    ],
    [copy.motion.saved, complete ? formatWad(freed(tickets)) : copy.portfolio.metricUnavailable],
    [
      copy.motion.pnl,
      position.pnlUsdc === undefined
        ? copy.portfolio.metricUnavailable
        : formatUsdc(position.pnlUsdc),
    ],
  ];

  return (
    <div className="border-b last:border-b-0 hover:bg-surface">
      <Link
        href={`/market/${encodeURIComponent(position.marketId)}?chain=${position.chainId}`}
        className="grid gap-4 p-6 xl:grid-cols-7"
      >
        <div className="min-w-0">
          <h2 className="break-words text-small font-medium">{position.question}</h2>
          <MiniCurve prices={position.positionWad} />
        </div>
        {fields.map(([label, value], i) => (
          <div key={label} className="flex min-w-0 justify-between gap-4 xl:block">
            <span className="text-small text-text-muted xl:hidden">{label}</span>
            <span
              className={
                label === copy.motion.saved
                  ? "tabular text-small text-saved"
                  : i > 0
                    ? "tabular text-small break-words"
                    : "text-small"
              }
            >
              {value}
            </span>
          </div>
        ))}
      </Link>

      {(position.canRedeem || finalizedUrl) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-surface-raised/40 px-6 py-3 text-small">
          <div>
            {finalizedUrl ? (
              <a
                href={finalizedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-accent hover:underline"
              >
                <span>{copy.market.finalizedEvent}</span>
                <ArrowUpRight size={13} aria-hidden />
              </a>
            ) : null}
          </div>
          <div>
            {position.canRedeem ? (
              <Button size="sm" onClick={() => void redeem()} disabled={isRedeeming}>
                {isRedeeming ? copy.portfolio.redeeming : copy.portfolio.redeem}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { MarketTrace } from "@/components/market/MarketTrace";
import { PositionPanel } from "@/components/market/PositionPanel";
import { copy } from "@/content/copy";
import { CurveEditor } from "@/features/curve";
import type { DataState } from "@/lib/data-state";
import { useBetWorkspace } from "../hooks/use-bet-workspace";
import type { MarketDetail, OwnerPosition } from "../types";
import { BetSlip } from "./BetSlip";
import { MarketDocuments } from "./MarketDocuments";
import { MobileBetSheet } from "./MobileBetSheet";
import { SettledMarketPanel } from "./SettledMarketPanel";
export function MarketWorkspace({
  market,
  position,
  connected,
  wrongNetwork,
}: {
  market: MarketDetail;
  position: DataState<OwnerPosition>;
  connected: boolean;
  wrongNetwork: boolean;
}) {
  const { grid, crowdPrices, value, onChange, highlight, slip, draft } = useBetWorkspace({
    market,
    position,
    connected,
    wrongNetwork,
  });
  return (
    <div className="flex flex-col gap-8 pb-24 lg:pb-0">
      <div className="grid-page items-start">
        <section className="col-span-4 flex min-w-0 flex-col gap-6 md:col-span-8 lg:col-span-7">
          <div className="flex items-center justify-between gap-4 border-b pb-4">
            <h2 className="text-h3">{copy.market.crowd}</h2>
            <span className="text-small text-text-muted">{copy.markets[market.kind]}</span>
          </div>
          <MarketTrace market={market}>
            <CurveEditor
              grid={grid}
              crowdPrices={crowdPrices}
              {...(market.status === "open" && draft.mode === "expressive"
                ? { value, onChange }
                : {})}
              {...(highlight ? { highlight } : {})}
              ariaLabel={copy.market.crowd}
            />
          </MarketTrace>
          {market.status === "open" && draft.mode === "expressive" && (
            <p className="text-small text-text-muted">{copy.motion.dragHelp}</p>
          )}
          <PositionPanel result={position} />
        </section>
        <div className="hidden lg:col-span-5 lg:block">
          {market.status === "open" ? (
            <BetSlip {...slip} />
          ) : market.status === "resolved" ? (
            <SettledMarketPanel market={market} />
          ) : (
            <p className="rounded-md border bg-surface p-6 text-text-muted">
              {copy.market[market.status]}
            </p>
          )}
        </div>
      </div>
      {market.status === "open" ? (
        <MobileBetSheet {...slip} />
      ) : market.status === "resolved" ? (
        <div className="lg:hidden">
          <SettledMarketPanel market={market} />
        </div>
      ) : (
        <p className="rounded-md border p-6 text-text-muted lg:hidden">
          {copy.market[market.status]}
        </p>
      )}
      <MarketDocuments chainId={market.chainId} marketId={market.marketId} />
    </div>
  );
}

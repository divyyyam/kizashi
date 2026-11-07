"use client";
import { copy } from "@/content/copy";
import { CurveEditor } from "@/features/curve";
import type { DataState } from "@/lib/data-state";
import { useBetWorkspace } from "../hooks/use-bet-workspace";
import type { MarketDetail, OwnerPosition } from "../types";
import { BetSlip } from "./BetSlip";
import { MarketCrowd } from "./MarketCrowd";
import { MarketDocuments } from "./MarketDocuments";
import { MobileBetSheet } from "./MobileBetSheet";
import { SettledMarketPanel } from "./SettledMarketPanel";
export function MarketWorkspace({
  market,
  position,
  connected,
  wrongNetwork,
  readWarning,
}: {
  market: MarketDetail;
  position: DataState<OwnerPosition>;
  connected: boolean;
  wrongNetwork: boolean;
  readWarning?: string | undefined;
}) {
  const workspace = useBetWorkspace({
    market,
    position,
    connected,
    wrongNetwork,
    readWarning,
  });
  const { slip } = workspace;
  return (
    <div className="flex flex-col gap-8 pb-24 lg:pb-0">
      <div className="grid-page items-start">
        <MarketCrowd market={market} position={position} workspace={workspace} />
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
        <MobileWorkspace workspace={workspace} />
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

const MOBILE_PREVIEW_HEIGHT = 180;

function MobileWorkspace({ workspace }: { workspace: ReturnType<typeof useBetWorkspace> }) {
  return (
    <MobileBetSheet
      {...workspace.slip}
      preview={
        <CurveEditor
          grid={workspace.grid}
          crowdPrices={workspace.crowdPrices}
          {...(workspace.draft.mode === "expressive" ? { value: workspace.value } : {})}
          {...(workspace.highlight ? { highlight: workspace.highlight } : {})}
          height={MOBILE_PREVIEW_HEIGHT}
          ariaLabel={copy.market.forecast}
        />
      }
    />
  );
}

import { MarketTrace } from "@/components/market/MarketTrace";
import { PositionPanel } from "@/components/market/PositionPanel";
import { copy } from "@/content/copy";
import { CurveEditor } from "@/features/curve";
import type { DataState } from "@/lib/data-state";
import { formatGrid } from "@/lib/format";
import "./bet-workspace.css";
import type { useBetWorkspace } from "../hooks/use-bet-workspace";
import type { BetDraft, MarketDetail, OwnerPosition } from "../types";

type Props = {
  market: MarketDetail;
  position: DataState<OwnerPosition>;
  workspace: ReturnType<typeof useBetWorkspace>;
};

export function MarketCrowd({ market, position, workspace }: Props) {
  const { grid, crowdPrices, value, onChange, highlight, draft } = workspace;
  return (
    <section className="market-canvas col-span-4 flex flex-col gap-6 md:col-span-8 lg:col-span-7">
      <div className="market-canvas-heading">
        <h2>{copy.market.crowd}</h2>
        <div className="market-canvas-legend">
          <span>{copy.market.crowdLegend}</span>
          {market.status === "open" && draft.mode === "expressive" ? (
            <span>{copy.market.draftLegend}</span>
          ) : null}
        </div>
      </div>
      {market.status === "open" && draft.mode === "expressive" ? (
        <DraftReadout market={market} draft={draft} />
      ) : null}
      <MarketTrace market={market}>
        <CurveEditor
          grid={grid}
          crowdPrices={crowdPrices}
          {...(market.status === "open" && draft.mode === "expressive" ? { value, onChange } : {})}
          {...(highlight ? { highlight } : {})}
          ariaLabel={copy.market.crowd}
        />
      </MarketTrace>
      {market.status === "open" && draft.mode === "expressive" ? (
        <p className="text-small text-text-muted">{copy.motion.dragHelp}</p>
      ) : null}
      {workspace.slip.connected ? <PositionPanel result={position} /> : null}
    </section>
  );
}

function DraftReadout({ market, draft }: { market: MarketDetail; draft: BetDraft }) {
  return (
    <dl className="market-draft-readout">
      <div>
        <dt>{copy.market.mean}</dt>
        <dd>
          {formatGrid(draft.mean, market.precision)} <small>{market.unit}</small>
        </dd>
      </div>
      <div>
        <dt>{copy.market.width}</dt>
        <dd>
          {formatGrid(draft.sigma, market.precision)} <small>{market.unit}</small>
        </dd>
      </div>
    </dl>
  );
}

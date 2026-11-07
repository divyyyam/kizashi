import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import type { DraftStore } from "../lib/draft-store";
import type { BetDraft, LocalQuote, MarketDetail } from "../types";
import { BetInputs } from "./BetInputs";
import { QuoteBreakdown } from "./QuoteBreakdown";
import { TradeControls } from "./TradeControls";
import "./bet-workspace.css";

export type BetSlipProps = {
  market: MarketDetail;
  draft: BetDraft;
  store: DraftStore;
  quote: DataState<LocalQuote>;
  connected: boolean;
  wrongNetwork: boolean;
};

export function BetSlip({
  market,
  draft,
  store,
  quote,
  connected,
  wrongNetwork,
  preview,
  hideHeading = false,
}: BetSlipProps & { preview?: ReactNode; hideHeading?: boolean }) {
  return (
    <section className="bet-slip" aria-label={copy.market.slip}>
      {!hideHeading ? (
        <header className="bet-slip-heading">
          <h2>{copy.market.slip}</h2>
          <span>{copy.market[draft.mode]}</span>
        </header>
      ) : null}
      {preview}
      <BetInputs
        market={market}
        draft={draft}
        patch={store.getState().patch}
        switchMode={(mode) => store.getState().switchMode(mode, market)}
      />
      {connected ? <QuoteBreakdown result={quote} /> : null}
      <TradeControls
        market={market}
        quote={quote}
        connected={connected}
        wrongNetwork={wrongNetwork}
      />
    </section>
  );
}

import type { ReactNode } from "react";

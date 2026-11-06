import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { ConnectButton } from "@/features/wallet";
import type { DataState } from "@/lib/data-state";
import { formatUsdc } from "@/lib/format";
import { useTrade } from "../hooks/use-trade";
import type { DraftStore } from "../lib/draft-store";
import type { BetDraft, LocalQuote, MarketDetail } from "../types";
import { BetInputs } from "./BetInputs";
import { QuoteBreakdown } from "./QuoteBreakdown";

export type BetSlipProps = {
  market: MarketDetail;
  draft: BetDraft;
  store: DraftStore;
  quote: DataState<LocalQuote>;
  connected: boolean;
  wrongNetwork: boolean;
};

export function BetSlip({ market, draft, store, quote, connected, wrongNetwork }: BetSlipProps) {
  const trade = useTrade({
    chainId: market.chainId,
    poolAddress: market.poolAddress,
    owner: quote.status === "ready" ? quote.data.owner : undefined,
    chargeUsdc: quote.status === "ready" ? quote.data.chargeUsdc : undefined,
  });

  const renderActionButton = () => {
    if (!connected) {
      return <ConnectButton className="w-full" />;
    }
    if (wrongNetwork) {
      return (
        <Button className="w-full" disabled>
          {copy.market.wrongNetwork}
        </Button>
      );
    }
    if (quote.status !== "ready" || trade.status !== "ready") {
      return (
        <Button className="w-full tabular" disabled>
          {copy.market.bet}
        </Button>
      );
    }
    if (trade.needsApproval) {
      return (
        <Button
          className="w-full"
          onClick={() => void trade.approve()}
          disabled={trade.isApproving}
        >
          {trade.isApproving ? copy.market.approvingUsdc : copy.market.approveUsdc}
        </Button>
      );
    }
    return (
      <Button
        className="w-full tabular"
        onClick={() => void trade.trade(quote.data.deltaWad, quote.data.chargeUsdc)}
        disabled={trade.isTrading}
      >
        {trade.isTrading
          ? copy.market.placingBet
          : copy.market.place(formatUsdc(quote.data.chargeUsdc))}
      </Button>
    );
  };

  const statusText = !connected
    ? copy.market.connect
    : wrongNetwork
      ? copy.market.wrongNetwork
      : trade.status === "not_ready"
        ? trade.reason
        : undefined;

  return (
    <section className="flex flex-col gap-6 rounded-md border bg-surface p-6">
      <h2 className="text-h3 font-medium">{copy.market.slip}</h2>
      <BetInputs
        market={market}
        draft={draft}
        patch={store.getState().patch}
        switchMode={(mode) => store.getState().switchMode(mode, market)}
      />
      <QuoteBreakdown result={quote} />
      <div className="flex flex-col gap-3">
        {renderActionButton()}
        {statusText && <p className="text-small text-text-muted">{statusText}</p>}
      </div>
    </section>
  );
}

import { RetryButton } from "@/components/feedback/RetryButton";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { useTrade } from "../hooks/use-trade";
import type { LocalQuote, MarketDetail } from "../types";
import { TradeButton } from "./TradeButton";

type Props = {
  market: MarketDetail;
  quote: DataState<LocalQuote>;
  connected: boolean;
  wrongNetwork: boolean;
};

export function TradeControls({ market, quote, connected, wrongNetwork }: Props) {
  const trade = useTrade({
    chainId: market.chainId,
    poolAddress: market.poolAddress,
    owner: quote.status === "ready" ? quote.data.owner : undefined,
    chargeUsdc: quote.status === "ready" ? quote.data.chargeUsdc : undefined,
  });
  const status = !connected
    ? copy.market.connect
    : wrongNetwork
      ? copy.market.wrongNetwork
      : trade.status === "not_ready"
        ? trade.reason
        : undefined;
  return (
    <div className="flex flex-col gap-3">
      <TradeButton quote={quote} trade={trade} connected={connected} wrongNetwork={wrongNetwork} />
      {trade.status === "not_ready" && trade.retry ? (
        <RetryButton retry={trade.retry} retryAt={trade.retryAt} busy={trade.refreshing} />
      ) : null}
      {status ? <p className="text-small text-text-muted">{status}</p> : null}
    </div>
  );
}

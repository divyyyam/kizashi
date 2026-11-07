import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { ConnectButton } from "@/features/wallet";
import type { DataState } from "@/lib/data-state";
import { formatUsdc } from "@/lib/format";
import type { useTrade } from "../hooks/use-trade";
import type { LocalQuote } from "../types";

type Props = {
  quote: DataState<LocalQuote>;
  trade: ReturnType<typeof useTrade>;
  connected: boolean;
  wrongNetwork: boolean;
};

export function TradeButton({ quote, trade, connected, wrongNetwork }: Props) {
  if (!connected) return <ConnectButton className="w-full" />;
  if (wrongNetwork)
    return (
      <Button className="w-full" disabled>
        {copy.market.wrongNetwork}
      </Button>
    );
  if (quote.status !== "ready" || trade.status !== "ready")
    return (
      <Button className="w-full" disabled>
        {copy.market.bet}
      </Button>
    );
  if (trade.needsApproval)
    return (
      <Button className="w-full" onClick={() => void trade.approve()} disabled={trade.isApproving}>
        {trade.isApproving ? copy.market.approvingUsdc : copy.market.approveUsdc}
      </Button>
    );
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
}

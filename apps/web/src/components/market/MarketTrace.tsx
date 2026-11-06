import { type ReactNode, ViewTransition } from "react";

export function MarketTrace({
  market,
  children,
}: {
  market: { chainId: number; marketId: string };
  children: ReactNode;
}) {
  return (
    <ViewTransition
      name={`market-${market.chainId}-${market.marketId}`}
      share="market-shared"
      default="none"
    >
      <div className="min-w-0">{children}</div>
    </ViewTransition>
  );
}

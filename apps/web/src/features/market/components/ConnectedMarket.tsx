"use client";
import { useMarketAccount } from "../hooks/use-market-account";
import { usePosition } from "../hooks/use-position";
import type { MarketDetail } from "../types";
import { MarketWorkspace } from "./MarketWorkspace";
export function ConnectedMarket({
  market,
  readWarning,
}: {
  market: MarketDetail;
  readWarning?: string | undefined;
}) {
  const account = useMarketAccount();
  const position = usePosition({ market, owner: account.owner });
  return (
    <MarketWorkspace
      key={`${account.owner}:${market.chainId}:${market.marketId}`}
      market={market}
      position={position}
      connected={account.connected}
      wrongNetwork={account.chainId !== market.chainId}
      readWarning={readWarning}
    />
  );
}

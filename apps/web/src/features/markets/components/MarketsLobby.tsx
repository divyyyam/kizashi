"use client";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useMarkets } from "../hooks/use-markets";
import { MarketList } from "./MarketList";
export function MarketsLobby() {
  const result = useMarkets();
  return (
    <NuqsAdapter>
      <MarketList result={result} />
    </NuqsAdapter>
  );
}

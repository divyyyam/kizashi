import { floorOf, freed, grossCollateral, nettedCollateral } from "@kizashi/core";
import { copy } from "@/content/copy";
import type { PortfolioPosition } from "../types";
export function portfolioCollateral(positions: readonly PortfolioPosition[]) {
  const active = positions.filter((position) => position.lifecycle === "active");
  const floorWad = active.reduce((sum, position) => sum + floorOf(position.positionWad), 0n);
  if (active.some((position) => position.history.status !== "complete"))
    return { status: "unavailable" as const, reason: copy.portfolio.incomplete, floorWad };
  let grossWad = 0n;
  let nettedWad = 0n;
  let freedWad = 0n;
  for (const position of active) {
    if (position.history.status !== "complete") continue;
    grossWad += grossCollateral(position.history.originalTicketsWad);
    nettedWad += nettedCollateral(position.history.originalTicketsWad);
    freedWad += freed(position.history.originalTicketsWad);
  }
  return {
    status: "ready" as const,
    grossWad,
    nettedWad,
    freedWad,
    floorWad,
    freedPercentWad: grossWad > 0n ? (freedWad * 10n ** 18n) / grossWad : undefined,
  };
}

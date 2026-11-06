import { copy } from "@/content/copy";
import type { PortfolioPosition } from "../types";
import { PositionRow } from "./PositionRow";
export function PositionList({ positions }: { positions: readonly PortfolioPosition[] }) {
  return (
    <div className="flex flex-col rounded-md border">
      <div className="hidden grid-cols-7 gap-4 border-b bg-surface px-6 py-4 text-small text-text-muted xl:grid">
        {[
          copy.portfolio.market,
          copy.portfolio.kind,
          copy.portfolio.floor,
          copy.portfolio.gross,
          copy.portfolio.netted,
          copy.motion.saved,
          copy.motion.pnl,
        ].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      {positions
        .filter((position) => position.lifecycle === "active")
        .map((position) => (
          <PositionRow
            key={`${position.chainId}:${position.marketId}:${position.owner}`}
            position={position}
          />
        ))}
    </div>
  );
}

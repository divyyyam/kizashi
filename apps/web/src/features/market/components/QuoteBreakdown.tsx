import { useEffect, useState } from "react";
import { RollingDigits } from "@/components/motion/RollingDigits";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { formatPercent, formatUsdc, formatWad } from "@/lib/format";
import type { LocalQuote } from "../types";
export function QuoteBreakdown({ result }: { result: DataState<LocalQuote> }) {
  const [lastQuote, setLastQuote] = useState<LocalQuote>();
  useEffect(() => {
    if (result.status === "ready") setLastQuote(result.data);
  }, [result]);
  const q =
    result.status === "ready" ? result.data : result.status === "loading" ? lastQuote : undefined;
  if (!q)
    return (
      <div role="status" className="border-t py-6 text-small text-text-muted">
        {result.status === "error"
          ? result.message
          : result.status === "unavailable"
            ? result.reason
            : result.status === "loading"
              ? copy.market.quoting
              : copy.market.enterSpend}
      </div>
    );
  const rows = [
    [copy.market.cost, formatUsdc(q.chargeUsdc, { suffix: true })],
    [copy.market.payout, formatWad(q.maxPayoutWad)],
    [copy.market.probability, formatPercent(q.probabilityWad)],
    [
      copy.market.locked,
      q.requirements.status === "ready"
        ? formatWad(q.requirements.lockedWad)
        : copy.market.metricUnavailable,
    ],
    [
      copy.market.freed,
      q.requirements.status === "ready"
        ? formatWad(q.requirements.freedChangeWad > 0n ? q.requirements.freedChangeWad : 0n)
        : copy.market.metricUnavailable,
    ],
  ];
  return (
    <section className="flex flex-col gap-4 border-t pt-6" aria-label={copy.market.quote}>
      {result.status === "loading" && (
        <p role="status" className="text-small text-text-muted">
          {copy.market.quoting}
        </p>
      )}
      <dl className="flex flex-col gap-4" aria-busy={result.status === "loading"}>
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap justify-between gap-2 text-small">
            <dt className="text-text-muted">{label}</dt>
            <dd className={label === copy.market.freed ? "text-saved" : ""}>
              <RollingDigits value={value ?? ""} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-small text-text-muted">
        {q.requirements.status === "unavailable" ? q.requirements.reason : copy.market.nettingHelp}
      </p>
      <dl className="flex flex-col gap-4 border-t pt-4">
        {[
          [copy.market.worstPayout, formatWad(q.minPayoutWad)],
          [copy.market.floor, formatWad(q.currentFloorWad)],
          [copy.market.floorAfter, formatWad(q.floorAfterWad)],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-wrap justify-between gap-2 text-small">
            <dt className="text-text-muted">{label}</dt>
            <dd className={label === copy.market.freed ? "text-saved" : ""}>
              <RollingDigits value={value ?? ""} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

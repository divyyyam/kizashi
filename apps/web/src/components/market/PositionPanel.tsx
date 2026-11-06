import { floorOf, freed } from "@kizashi/core";
import { RollingDigits } from "@/components/motion/RollingDigits";
import { copy } from "@/content/copy";
import type { OwnerPosition } from "@/features/market";
import type { DataState } from "@/lib/data-state";
import { formatWad } from "@/lib/format";

export function PositionPanel({ result }: { result: DataState<OwnerPosition> }) {
  if (result.status !== "ready")
    return (
      <p className="border-t py-4 text-small text-text-muted">{copy.market.positionUnavailable}</p>
    );
  const { history, positionWad } = result.data;
  const rows = [
    [
      copy.motion.tickets,
      history.status === "complete"
        ? String(history.originalTicketsWad.length)
        : copy.market.metricUnavailable,
    ],
    [copy.portfolio.floor, formatWad(floorOf(positionWad))],
    [
      copy.motion.saved,
      history.status === "complete"
        ? formatWad(freed(history.originalTicketsWad))
        : copy.market.metricUnavailable,
    ],
  ] as const;
  return (
    <section aria-label={copy.motion.position} className="border-t pt-5">
      <h2 className="text-label text-text-muted">{copy.motion.position}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-small text-text-muted">{label}</dt>
            <dd className={label === copy.motion.saved ? "text-saved" : ""}>
              <RollingDigits value={value} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

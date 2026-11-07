import { copy } from "@/content/copy";

export function PreviewFacts({
  close,
  source,
  subsidy,
  maxLoss,
}: {
  close: number;
  source: string;
  subsidy: string;
  maxLoss: string | undefined;
}) {
  return (
    <dl className="grid gap-4 border-t border-border pt-5">
      {[
        [
          copy.create.closes,
          Number.isFinite(close) ? new Date(close).toLocaleString() : copy.market.metricUnavailable,
        ],
        [
          copy.feedback.metadata.resolution,
          source === "manual" ? copy.feedback.metadata.manual(30) : copy.feedback.metadata.twap,
        ],
        [copy.create.liquidity, subsidy ? `${subsidy} USDC` : copy.market.metricUnavailable],
        [copy.create.maxLoss, maxLoss ?? copy.market.metricUnavailable],
      ].map(([label, value]) => (
        <div key={label} className="space-y-1">
          <dt className="text-text-faint">{label}</dt>
          <dd className="break-words tabular text-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

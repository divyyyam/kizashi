import type { MarketMetadata } from "@kizashi/schemas/market";
import { copy } from "@/content/copy";

export function MarketResolution({ metadata }: { metadata: MarketMetadata }) {
  const rule = metadata.resolution;
  const text = copy.feedback.metadata;
  return (
    <div className="grid min-w-0 gap-3 border-t border-border pt-5">
      <h3 className="text-label text-text-muted">{text.resolution}</h3>
      <p className="break-words whitespace-pre-line text-small">{rule.criteria}</p>
      {rule.edgeCases ? (
        <p className="break-words whitespace-pre-line text-small text-text-muted">
          {text.edgeCases}: {rule.edgeCases}
        </p>
      ) : null}
      <dl className="grid gap-3 text-small sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-text-faint">{text.source}</dt>
          <dd className="break-words">
            {rule.sourceUrl ? (
              <a
                href={rule.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-signal underline-offset-4 hover:underline"
              >
                {rule.sourceName}
              </a>
            ) : (
              rule.sourceName
            )}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-text-faint">{text.closes}</dt>
          <dd>
            {new Date(metadata.closeTimeSec * 1000).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </dd>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <dt className="text-text-faint">{text.method}</dt>
          <dd className="text-text-muted">
            {rule.source === "uniswap-twap"
              ? text.twap
              : text.manual(Math.round(rule.disputeWindowSec / 60))}
          </dd>
        </div>
      </dl>
    </div>
  );
}

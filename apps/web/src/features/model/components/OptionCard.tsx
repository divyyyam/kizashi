import { modelCopy } from "@/content/model-copy";
import { formatSignedUsd } from "@/features/model/lib/money";
import { cn } from "@/lib/cn";

export type OptionFact = { readonly label: string; readonly value: string };

type OptionCardProps = {
  readonly title: string;
  readonly facts: readonly OptionFact[];
  readonly expectedReturnUsd: number;
  readonly barRatio: number;
  readonly why: string;
  readonly isPick: boolean;
};

export function OptionCard({
  title,
  facts,
  expectedReturnUsd,
  barRatio,
  why,
  isPick,
}: OptionCardProps) {
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col gap-2.5 border-t-2 py-3",
        isPick ? "border-signal" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-small font-medium text-text">{title}</h3>
        {isPick ? (
          <span className="flex items-center gap-1.5 text-small text-signal">
            <span aria-hidden className="size-1.5 rounded-full bg-signal" />
            {modelCopy.options.enginePick}
          </span>
        ) : null}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-small text-text-muted">{modelCopy.options.expectedReturn}</span>
        <span
          className={cn(
            "tabular text-lg",
            expectedReturnUsd < 0 ? "text-negative" : isPick ? "text-signal" : "text-text",
          )}
        >
          {formatSignedUsd(expectedReturnUsd)}
        </span>
      </div>
      <div aria-hidden className="h-1 overflow-hidden rounded-full bg-surface-raised">
        <div
          className={cn("model-grow h-full origin-left", isPick ? "bg-signal" : "bg-text-faint")}
          style={{ transform: `scaleX(${barRatio})` }}
        />
      </div>
      <dl className="grid gap-1 text-small">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-wrap justify-between gap-x-3">
            <dt className="text-text-muted">{fact.label}</dt>
            <dd className="tabular text-text">{fact.value}</dd>
          </div>
        ))}
      </dl>
      <details className="border-t border-border pt-1">
        <summary className="cursor-pointer py-1 text-small text-text-muted hover:text-text">
          {modelCopy.options.rationale}
        </summary>
        <p className="pb-1 text-small text-text-muted">{why}</p>
      </details>
    </article>
  );
}

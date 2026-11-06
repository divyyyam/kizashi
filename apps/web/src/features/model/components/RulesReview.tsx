import type { pendingRulesSchema } from "@kizashi/schemas/engine";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { workspaceCopy as text } from "@/content/model-workspace-copy";
import { formatUsdc } from "@/lib/format";

export function RulesReview({
  pending,
  busy,
  onConfirm,
}: {
  pending: z.infer<typeof pendingRulesSchema>;
  busy: boolean;
  onConfirm: () => void;
}) {
  const rules = pending.ruleSet;
  const limits = [
    [text.budget, rules.budgetUsdc],
    [text.perTrade, rules.perTradeCapUsdc],
    [text.daily, rules.dailyCapUsdc],
    [text.marketLoss, rules.maxLossPerMarketUsdc],
    [text.drawdown, rules.maxDrawdownUsdc],
  ] as const;
  return (
    <section
      className="flex flex-col gap-4 rounded-lg border border-signal bg-surface p-5"
      aria-labelledby="model-rules-review"
    >
      <header>
        <p className="mb-2 text-label uppercase text-signal">{text.paused}</p>
        <h2 id="model-rules-review" className="text-h3 text-text">
          {text.confirm}
        </h2>
      </header>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {limits.map(([label, value]) => (
          <div key={label}>
            <dt className="text-small text-text-muted">{label}</dt>
            <dd className="mt-1 font-mono text-body text-text">{formatUsdc(BigInt(value))}</dd>
          </div>
        ))}
        <div>
          <dt className="text-small text-text-muted">{text.expires}</dt>
          <dd className="mt-1 text-small text-text">
            {new Date(rules.stopAtSec * 1000).toLocaleString()}
          </dd>
        </div>
      </dl>
      <dl className="grid gap-3 text-small">
        <div>
          <dt className="text-text-muted">{text.markets}</dt>
          <dd className="break-words text-text">
            {rules.allowedMarketIds.join(", ") || text.noMarkets}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">{text.shapes}</dt>
          <dd className="text-text">{rules.allowedShapes.join(", ")}</dd>
        </div>
        {rules.notes ? (
          <div>
            <dt className="text-text-muted">{text.notes}</dt>
            <dd className="whitespace-pre-wrap break-words text-text">{rules.notes}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-text-muted">{text.hash}</dt>
          <dd className="break-all font-mono text-label text-text-faint">{pending.rulesHash}</dd>
        </div>
      </dl>
      {pending.warnings.map((warning) => (
        <p key={warning} className="text-small text-warning">
          {warning}
        </p>
      ))}
      <Button type="button" disabled={busy} onClick={onConfirm} className="self-start">
        {busy ? text.busy : text.confirm}
      </Button>
    </section>
  );
}

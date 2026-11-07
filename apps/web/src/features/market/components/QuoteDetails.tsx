import { copy } from "@/content/copy";
import { formatPercent, formatUsdc, formatWad } from "@/lib/format";
import type { LocalQuote } from "../types";
import { QuoteRows } from "./QuoteRows";

export function QuoteDetails({ quote, updating }: { quote: LocalQuote; updating: boolean }) {
  return (
    <section className="bet-quote" aria-label={copy.market.quote} aria-busy={updating}>
      <div className="quote-heading">
        <h3>{copy.market.quote}</h3>
        {updating ? <span role="status">{copy.market.quoting}</span> : null}
      </div>
      <dl className="quote-primary">
        <div>
          <dt>{copy.market.cost}</dt>
          <dd>{formatUsdc(quote.chargeUsdc, { suffix: true })}</dd>
        </div>
        <div>
          <dt>{copy.market.payout}</dt>
          <dd>{formatWad(quote.maxPayoutWad)}</dd>
        </div>
      </dl>
      <QuoteRows rows={[[copy.market.probability, formatPercent(quote.probabilityWad)]]} />
      <div className="mt-4">
        <QuoteCollateral quote={quote} />
      </div>
      <details className="quote-details">
        <summary>{copy.market.quoteDetails}</summary>
        <div>
          <QuoteRows
            rows={[
              [copy.market.worstPayout, formatWad(quote.minPayoutWad)],
              [copy.market.floor, formatWad(quote.currentFloorWad)],
              [copy.market.floorAfter, formatWad(quote.floorAfterWad)],
            ]}
          />
        </div>
        {quote.requirements.status === "ready" ? (
          <p className="mt-4 text-small text-text-faint">{copy.market.nettingHelp}</p>
        ) : null}
      </details>
    </section>
  );
}

function QuoteCollateral({ quote }: { quote: LocalQuote }) {
  const requirements = quote.requirements;
  if (requirements.status !== "ready") {
    return <p className="text-small text-text-muted">{copy.feedback.historyNeeded}</p>;
  }
  return (
    <div className="space-y-3">
      <QuoteRows
        rows={[
          [copy.market.locked, formatWad(requirements.lockedWad)],
          [
            copy.market.freed,
            formatWad(requirements.freedChangeWad > 0n ? requirements.freedChangeWad : 0n),
          ],
        ]}
      />
    </div>
  );
}

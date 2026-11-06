import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { workspaceCopy as text } from "@/content/model-workspace-copy";
import { formatUsdc } from "@/lib/format";
import type { Approval } from "../lib/engine-trade";

export function ProposalReview({
  approval,
  busy,
  onDecision,
}: {
  approval: Approval;
  busy: boolean;
  onDecision: (decision: "approve" | "reject") => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const expired = now >= approval.expiresAtSec * 1000;
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-signal bg-surface p-5">
      <header className="flex flex-wrap justify-between gap-2">
        <h2 className="text-h3 text-text">{text.proposal}</h2>
        <Link
          href={`/markets/${encodeURIComponent(approval.trade.marketId)}`}
          className="text-small text-signal underline"
        >
          {text.market(approval.trade.marketId)}
        </Link>
      </header>
      <p className="text-body text-text">{approval.rationale}</p>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-small text-text-muted">{text.charge}</dt>
          <dd className="font-mono text-h3 text-text">
            {formatUsdc(BigInt(approval.trade.chargeUsdc))}
          </dd>
        </div>
        <div>
          <dt className="text-small text-text-muted">{text.limit}</dt>
          <dd className="font-mono text-h3 text-text">
            {formatUsdc(BigInt(approval.trade.limitUsdc))}
          </dd>
        </div>
        <div>
          <dt className="text-small text-text-muted">{text.block}</dt>
          <dd className="font-mono text-small text-text">{approval.trade.quotedAtBlock}</dd>
        </div>
        <div>
          <dt className="text-small text-text-muted">{text.expires}</dt>
          <dd className="text-small text-text">
            {new Date(approval.expiresAtSec * 1000).toLocaleTimeString()}
          </dd>
        </div>
      </dl>
      <p className="text-small text-saved">
        {approval.verdict.passed ? text.passed : text.rejected}
        {approval.verdict.nets ? ` · ${text.nets}` : ""}
      </p>
      {expired ? (
        <p role="status" className="text-small text-warning">
          {text.expired}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={busy || expired || !approval.verdict.passed}
          onClick={() => onDecision("approve")}
        >
          {text.approve}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || expired}
          onClick={() => onDecision("reject")}
        >
          {text.reject}
        </Button>
      </div>
    </section>
  );
}

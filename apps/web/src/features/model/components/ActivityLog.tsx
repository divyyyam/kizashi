import type { RunEvent } from "@kizashi/schemas/engine";
import { ArrowUpRight, ListTree } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Hex } from "viem";
import { workspaceCopy as text } from "@/content/model-workspace-copy";
import { env } from "@/lib/env";
import { txUrl } from "@/lib/explorer";
import { formatUsdc } from "@/lib/format";

export function ActivityLog({
  events,
  started,
}: {
  events: readonly RunEvent[];
  started: boolean;
}) {
  const list = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const visible = events.filter((event) => event.type !== "node");
  useEffect(() => {
    if (events.length && following.current && list.current)
      list.current.scrollTop = list.current.scrollHeight;
  }, [events]);
  return (
    <section className="flex min-h-64 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-h3 text-text">{text.activity}</h2>
        <span className="font-mono text-label text-text-faint">
          {text.eventCount(visible.length)}
        </span>
      </header>
      <div
        ref={list}
        className="model-activity min-h-0 flex-1 overflow-y-auto p-5"
        onScroll={(event) => {
          const node = event.currentTarget;
          following.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
        }}
      >
        {visible.length ? (
          <ol className="flex flex-col gap-4">
            {visible.map((event) => (
              <li key={event.seq} className="grid gap-2 border-b border-border pb-4 last:border-0">
                <time
                  dateTime={new Date(event.tSec * 1000).toISOString()}
                  className="font-mono text-label text-text-faint"
                >
                  {new Date(event.tSec * 1000).toLocaleTimeString()}
                </time>
                <EventContent event={event} />
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex min-h-52 flex-col items-start justify-center gap-3">
            <ListTree aria-hidden className="size-6 text-text-faint" />
            <h3 className="font-display text-h2 text-text">
              {started ? text.noEvents : text.emptyTitle}
            </h3>
            <p className="max-w-lg text-small text-text-muted">{text.emptyBody}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function EventContent({ event }: { event: RunEvent }) {
  if (event.type === "plan")
    return (
      <div className="flex flex-col gap-3">
        {event.data.action === "hold" ? (
          <p className="text-small text-text">{text.hold}</p>
        ) : (
          event.data.candidates.map((candidate, index) => (
            <article
              key={`${event.seq}:${candidate.marketId}:${JSON.stringify(candidate.shape)}`}
              className="rounded-md border border-border bg-bg p-3"
            >
              <div className="flex flex-wrap justify-between gap-2 text-small">
                <span className="text-signal">
                  {text.candidate(index)} · {text.market(candidate.marketId)}
                </span>
                <span className="font-mono text-text">
                  {formatUsdc(BigInt(candidate.spendUsdc))}
                </span>
              </div>
              <p className="mt-2 text-small text-text-muted">{candidate.rationale}</p>
              <p className="mt-2 font-mono text-label text-text-faint">
                {candidate.shape.kind} · {candidate.ruleRefs.join(", ")}
              </p>
            </article>
          ))
        )}
      </div>
    );
  if (event.type === "verdicts")
    return (
      <ul className="flex flex-col gap-2">
        {event.data.items.map((verdict, index) => (
          <li
            key={`${event.seq}:${verdict.candidateIndex ?? verdict.reasons.join("-")}`}
            className="text-small text-text"
          >
            <span className={verdict.passed ? "text-saved" : "text-warning"}>
              {text.candidate(verdict.candidateIndex ?? index)}:{" "}
              {verdict.passed ? text.passed : text.rejected}
            </span>
            {verdict.reasons.length ? (
              <p className="mt-1 font-mono text-label text-text-muted">
                {verdict.reasons.join(", ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    );
  if (event.type === "tx_pending" || event.type === "executed") {
    const href = txUrl(env.NEXT_PUBLIC_CHAIN_ID, event.data.txHash as Hex);
    return href ? (
      <a
        className="inline-flex min-h-10 items-center gap-2 text-small text-signal underline"
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {text.receipt}
        <ArrowUpRight aria-hidden className="size-4" />
      </a>
    ) : (
      <p className="break-all font-mono text-small text-text">{event.data.txHash}</p>
    );
  }
  const label =
    event.type === "log" || event.type === "error"
      ? event.data.message
      : event.type === "rules_pending"
        ? text.confirm
        : event.type === "approval_needed"
          ? text.proposal
          : event.type === "tx_needed"
            ? text.approved
            : event.type === "tick_ended"
              ? text.outcome(event.data.outcome)
              : event.type === "run_stopped"
                ? text.stopped
                : event.type === "resync"
                  ? text.resync
                  : "";
  return (
    <p
      className={event.type === "error" ? "text-small text-warning" : "text-small text-text-muted"}
    >
      {label}
    </p>
  );
}

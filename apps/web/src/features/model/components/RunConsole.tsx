import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workspaceCopy as text } from "@/content/model-workspace-copy";
import type { EngineSession } from "../hooks/use-engine-session";
import { ActivityLog } from "./ActivityLog";
import { PipelineRail } from "./PipelineRail";
import { ProposalReview } from "./ProposalReview";
import { RulesReview } from "./RulesReview";
import { TransactionReview } from "./TransactionReview";

export function RunConsole({ session }: { session: EngineSession }) {
  const { state } = session;
  const pending = state.snapshot?.pending;
  return (
    <div className="model-console flex min-h-0 min-w-0 flex-col gap-4">
      <PipelineRail state={state} />
      {session.runId ? <RunControls session={session} /> : null}
      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-warning bg-surface p-4 text-small text-warning"
        >
          {state.error}
        </p>
      ) : null}
      {pending && !state.stopped ? (
        "ruleSet" in pending ? (
          <RulesReview
            pending={pending}
            busy={state.busy}
            onConfirm={() =>
              void session.resume({ v: 1, kind: "confirmRules", rulesHash: pending.rulesHash })
            }
          />
        ) : "trade" in pending ? (
          <ProposalReview
            approval={pending}
            busy={state.busy}
            onDecision={(decision) =>
              void session.resume({ v: 1, kind: "approval", tradeId: pending.tradeId, decision })
            }
          />
        ) : (
          <TransactionReview key={pending.tradeId} pending={pending} session={session} />
        )
      ) : null}
      <ActivityLog events={state.events} started={Boolean(state.snapshot)} />
    </div>
  );
}

function RunControls({ session }: { session: EngineSession }) {
  const { state } = session;
  const snapshot = state.snapshot;
  if (!snapshot)
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-border-strong bg-surface p-5">
        <h2 className="text-h3 text-text">{text.restored}</h2>
        <p className="text-small text-text-muted">{text.restoreHelp}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={state.busy || !session.identity.ready}
            onClick={() => void session.restore()}
          >
            {text.restore}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={state.busy}
            onClick={() => void session.reset()}
          >
            {text.newRun}
          </Button>
        </div>
      </section>
    );
  const canTick = snapshot.run.status === "rules_confirmed" && !snapshot.pending && !state.stopped;
  return (
    <section
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3"
      aria-label={text.activity}
    >
      {canTick ? (
        <Button type="button" disabled={state.busy} onClick={() => void session.tick()}>
          {state.busy ? text.busy : text.tick}
        </Button>
      ) : null}
      {!state.stopped ? (
        <Button
          type="button"
          variant="secondary"
          disabled={state.busy}
          title={text.stopHelp}
          onClick={() => void session.stop()}
        >
          {text.stop}
        </Button>
      ) : (
        <span role="status" className="text-small text-text-muted">
          {text.stopped}
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        disabled={state.busy}
        onClick={() => void session.restore()}
      >
        <RefreshCw aria-hidden className="size-4" />
        {state.streamConnected ? text.refresh : text.reconnect}
      </Button>
      {state.stopped ? (
        <Button
          type="button"
          variant="secondary"
          disabled={state.busy}
          onClick={() => void session.reset()}
        >
          {text.newRun}
        </Button>
      ) : null}
    </section>
  );
}

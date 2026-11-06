import { Check, Circle, Pause, SkipForward } from "lucide-react";
import { workspaceCopy as text } from "@/content/model-workspace-copy";
import { cn } from "@/lib/cn";
import type { GraphNode, SessionState } from "../lib/engine-session-state";

const STAGES: readonly (readonly GraphNode[])[] = [
  ["ingestRules", "confirmRules", "loadContext", "gate"],
  ["plan", "compile", "risk", "select"],
  ["publishProposal", "suggestApproval", "awaitUserTx", "confirm", "record"],
];

export function PipelineRail({ state }: { state: SessionState }) {
  const pending = state.snapshot?.pending;
  const paused = !pending
    ? null
    : "ruleSet" in pending
      ? "confirmRules"
      : "trade" in pending
        ? "suggestApproval"
        : "awaitUserTx";
  return (
    <section
      aria-labelledby="model-pipeline"
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="model-pipeline" className="text-h3 text-text">
            {text.pipeline}
          </h2>
          <p className="mt-1 text-small text-text-muted">{text.pipelineHelp}</p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 font-mono text-label text-text-muted">
          {text.suggest}
        </span>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {STAGES.map((nodes, index) => (
          <div key={nodes[0]} className="min-w-0">
            <h3 className="mb-3 border-b border-border pb-2 text-label uppercase text-text-faint">
              {text.stages[index]}
            </h3>
            <ol className="flex flex-col gap-1">
              {nodes.map((node) => (
                <PipelineNode
                  key={node}
                  node={node}
                  status={paused === node ? "paused" : (state.nodes[node] ?? "waiting")}
                />
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

function PipelineNode({
  node,
  status,
}: {
  node: GraphNode;
  status: "waiting" | "done" | "skipped" | "paused";
}) {
  const Icon =
    status === "done"
      ? Check
      : status === "paused"
        ? Pause
        : status === "skipped"
          ? SkipForward
          : Circle;
  return (
    <li
      className={cn(
        "flex min-h-10 items-center gap-2 rounded-md px-2 py-2",
        status === "paused" && "bg-surface-raised",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-3.5 shrink-0",
          status === "done"
            ? "text-saved"
            : status === "paused"
              ? "text-signal"
              : "text-text-faint",
        )}
        strokeWidth={1.5}
      />
      <span
        className={cn("min-w-0 text-small", status === "waiting" ? "text-text-faint" : "text-text")}
      >
        {text.nodes[node]}
        <span className="sr-only">: {text[status]}</span>
      </span>
      {node === "plan" ? (
        <span className="ml-auto rounded-sm border border-border px-1 py-0.5 font-mono text-label text-signal">
          {text.model}
        </span>
      ) : null}
    </li>
  );
}

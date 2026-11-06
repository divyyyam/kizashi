import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { useId, useState } from "react";
import { modelCopy } from "@/content/model-copy";
import type { StepState } from "@/features/model/lib/run-reducer";
import { STEP_IDS, type StepId } from "@/features/model/types";
import { cn } from "@/lib/cn";

function ThinkingStep({ id, step }: { id: StepId; step: StepState }) {
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();
  const active = step.status === "active";
  const open = active || expanded;
  const Icon = step.status === "done" ? Check : active ? LoaderCircle : null;
  return (
    <li className={cn("rounded-md", active && "bg-surface")}>
      <button
        type="button"
        disabled={step.detail === null}
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setExpanded(!expanded)}
        className="group flex min-h-10 w-full items-center gap-2.5 rounded-md px-2 text-left disabled:cursor-default"
      >
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-full border",
            active ? "border-signal text-signal" : "border-border text-text-muted",
          )}
        >
          {Icon ? (
            <Icon
              aria-hidden
              strokeWidth={1.5}
              className={cn("size-3", active && "motion-safe:animate-spin")}
            />
          ) : (
            <span aria-hidden className="size-1 rounded-full bg-border-strong" />
          )}
        </span>
        <span
          className={cn(
            "flex-1 text-small",
            step.status === "pending" ? "text-text-faint" : "text-text",
          )}
        >
          {modelCopy.steps.labels[id]}
          <span className="sr-only">, {modelCopy.steps.status[step.status]}</span>
        </span>
        {step.detail ? (
          <ChevronDown aria-hidden className={cn("size-3 text-text-faint", open && "rotate-180")} />
        ) : null}
      </button>
      <p
        id={detailId}
        hidden={!open || step.detail === null}
        className="pb-3 pl-10 pr-2 text-small text-text-muted"
      >
        {step.detail}
      </p>
    </li>
  );
}

export function ThinkingSteps({ steps }: { readonly steps: Readonly<Record<StepId, StepState>> }) {
  const done = STEP_IDS.filter((id) => steps[id].status === "done").length;
  return (
    <section aria-labelledby="engine-steps" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-2">
        <h2 id="engine-steps" className="text-label text-text-faint">
          {modelCopy.steps.title}
        </h2>
        <span
          title={modelCopy.workspace.progress(done, STEP_IDS.length)}
          className="shrink-0 tabular text-label text-text-faint"
        >
          {done}/{STEP_IDS.length}
        </span>
      </div>
      <ol className="flex flex-col gap-0.5">
        {STEP_IDS.map((id) => (
          <ThinkingStep key={id} id={id} step={steps[id]} />
        ))}
      </ol>
    </section>
  );
}

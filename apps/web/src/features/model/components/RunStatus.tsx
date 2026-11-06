import { modelCopy } from "@/content/model-copy";
import type { RunState } from "@/features/model/lib/run-reducer";
import { cn } from "@/lib/cn";

export function RunStatus({ state }: { readonly state: RunState }) {
  const text = modelCopy.workspace;
  const status = state.settlement
    ? text.settled
    : state.status === "finished"
      ? text.finished
      : state.status === "unavailable"
        ? text.unavailable
        : text.running;
  return (
    <span role="status" className="flex items-center gap-2 text-small text-text-muted">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          state.status === "running" ? "bg-signal" : "bg-text-faint",
        )}
      />
      {status}
    </span>
  );
}

import { CheckCircle2, Circle, LoaderCircle, XCircle } from "lucide-react";
import { copy } from "@/content/copy";
import type { CreateProgress, CreateStep } from "../lib/creation-progress";

const ORDER: readonly CreateStep[] = ["approve", "create", "listing"];
export function CreateProgressTrack({
  progress,
}: {
  progress: Exclude<CreateProgress, { phase: "idle" }>;
}) {
  const steps = ORDER;
  const current = progress.phase === "done" ? undefined : progress.step;
  const index = current ? steps.indexOf(current) : steps.length;
  return (
    <ol className="grid gap-4">
      {steps.map((step, number) => {
        const status =
          progress.phase === "done"
            ? step === "listing" && progress.listing.error
              ? "failed"
              : "done"
            : number < index
              ? "done"
              : number === index
                ? progress.phase === "failed"
                  ? "failed"
                  : "active"
                : "todo";
        const Icon =
          status === "done"
            ? CheckCircle2
            : status === "failed"
              ? XCircle
              : status === "active"
                ? LoaderCircle
                : Circle;
        return (
          <li key={step} className="flex items-center gap-3">
            <Icon
              aria-hidden
              className={
                status === "failed"
                  ? "size-4 shrink-0 text-warning"
                  : status === "active"
                    ? "size-4 shrink-0 text-signal motion-safe:animate-spin"
                    : "size-4 shrink-0 text-text-faint"
              }
            />
            <span className={status === "todo" ? "text-text-faint" : "text-text"}>
              {copy.feedback.create.steps[step]}
            </span>
            <span className="sr-only">{copy.feedback.create.phase[status]}</span>
          </li>
        );
      })}
    </ol>
  );
}

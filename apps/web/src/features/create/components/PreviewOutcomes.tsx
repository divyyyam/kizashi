import { copy } from "@/content/copy";
import type { CreateFormValues } from "../types";

export function PreviewOutcomes({
  values,
  count,
  probability,
}: {
  values: CreateFormValues;
  count: number | undefined;
  probability: string | undefined;
}) {
  if (values.kind === "binary")
    return (
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: "yes", label: values.yesLabel || copy.feedback.create.yes },
          { id: "no", label: values.noLabel || copy.feedback.create.no },
        ].map((outcome) => (
          <div
            key={outcome.id}
            className="flex min-w-0 flex-wrap justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <span className="break-words">{outcome.label}</span>
            <span className="tabular text-text-muted">50%</span>
          </div>
        ))}
      </div>
    );
  return (
    <p className="break-words text-text-muted">
      {count
        ? copy.feedback.create.initialRange(
            count,
            values.low,
            values.high,
            values.unit,
            probability ?? "—",
          )
        : copy.feedback.create.rangeHelp}
    </p>
  );
}

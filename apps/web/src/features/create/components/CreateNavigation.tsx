import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import type { useCreateForm } from "../hooks/use-create-form";

export function CreateNavigation({ state }: { state: ReturnType<typeof useCreateForm> }) {
  const { step, setStep, last, busy, done, action } = state;
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
      {step > 0 && !done ? (
        <Button type="button" variant="secondary" disabled={busy} onClick={() => setStep(step - 1)}>
          {copy.feedback.create.back}
        </Button>
      ) : null}
      {!done ? (
        <Button type="submit" disabled={busy || (last && !action.ready)}>
          {busy ? <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" /> : null}
          {last
            ? busy
              ? copy.feedback.create.submitting
              : copy.feedback.create.submit
            : copy.feedback.create.next}
        </Button>
      ) : null}
      {last && action.reason ? (
        <p role="status" className="text-small text-text-muted">
          {action.reason}
        </p>
      ) : null}
    </div>
  );
}

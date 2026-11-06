import { type FormEvent, useId, useRef } from "react";
import { modelCopy } from "@/content/model-copy";
import type { FlightOrigin } from "@/features/model/hooks/use-flight";
import { parseBudgetUsdc } from "@/features/model/lib/money";
import type { RunRequest } from "@/features/model/types";
import { ComposerControls } from "./ComposerControls";
import type { ComposerDraft } from "./composer-draft";

type PromptFormProps = {
  readonly draft: ComposerDraft;
  readonly onDraft: (patch: Partial<ComposerDraft>) => void;
  readonly onRun: (request: RunRequest, origin: FlightOrigin) => void;
};

export function PromptForm({ draft, onDraft, onRun }: PromptFormProps) {
  const id = useId();
  const box = useRef<HTMLFormElement>(null);
  const budgetUsdc = parseBudgetUsdc(draft.budget);
  const prompt = draft.prompt.trim();
  const ready = prompt.length > 0 && budgetUsdc !== null;
  function run(event: FormEvent) {
    event.preventDefault();
    if (!ready || box.current === null) return;
    const { left, top, width, height } = box.current.getBoundingClientRect();
    const rulesFileName = draft.rulesFile?.name ?? null;
    onRun({ prompt, rulesFileName, budgetUsdc, mode: draft.mode }, { left, top, width, height });
  }
  return (
    <form
      ref={box}
      onSubmit={run}
      className="flex shrink-0 flex-col gap-4 rounded-xl border border-border-strong bg-surface p-4 transition-colors duration-(--motion-quick) focus-within:border-signal md:p-5"
    >
      <label htmlFor={id} className="sr-only">
        {modelCopy.idle.promptLabel}
      </label>
      <textarea
        id={id}
        rows={3}
        value={draft.prompt}
        onChange={(event) => onDraft({ prompt: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) run(event);
        }}
        placeholder={modelCopy.idle.promptPlaceholder}
        className="w-full resize-none bg-transparent text-body text-text placeholder:text-text-faint focus-visible:outline-none"
      />
      <ComposerControls draft={draft} onDraft={onDraft} ready={ready} id={`${id}-mode`} />
    </form>
  );
}

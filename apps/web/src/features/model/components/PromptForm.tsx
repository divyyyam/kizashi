import { type FormEvent, type RefObject, useId, useRef } from "react";
import type { FlightOrigin } from "@/features/model/hooks/use-flight";
import { useVoiceInput } from "@/features/model/hooks/use-voice-input";
import { parseBudgetUsdc } from "@/features/model/lib/money";
import type { RunRequest } from "@/features/model/types";
import { ComposerControls } from "./ComposerControls";
import { ComposerPrompt } from "./ComposerPrompt";
import type { ComposerDraft } from "./composer-draft";

type PromptFormProps = {
  readonly draft: ComposerDraft;
  readonly onDraft: (patch: Partial<ComposerDraft>) => void;
  readonly onRun: (request: RunRequest, origin: FlightOrigin) => void;
  readonly inputRef: RefObject<HTMLTextAreaElement | null>;
};

export function PromptForm({ draft, onDraft, onRun, inputRef }: PromptFormProps) {
  const id = useId();
  const box = useRef<HTMLFormElement>(null);
  const voice = useVoiceInput();
  const budgetUsdc = parseBudgetUsdc(draft.budget);
  const prompt = draft.prompt.trim();
  const busy = ["requesting", "recording", "transcribing", "review"].includes(voice.status);
  const ready = prompt.length > 0 && budgetUsdc !== null && !busy;
  function run(event: FormEvent) {
    event.preventDefault();
    if (!ready || box.current === null) return;
    const { left, top, width, height } = box.current.getBoundingClientRect();
    const rulesFileName = draft.rulesFile?.name ?? null;
    onRun({ prompt, rulesFileName, budgetUsdc, mode: draft.mode }, { left, top, width, height });
  }
  return (
    <form ref={box} onSubmit={run} className="model-composer" data-voice={voice.status}>
      <ComposerPrompt
        id={id}
        inputRef={inputRef}
        prompt={draft.prompt}
        onPrompt={(value) => onDraft({ prompt: value })}
        onSubmit={run}
        voice={voice}
      />
      <ComposerControls
        draft={draft}
        onDraft={onDraft}
        ready={ready}
        id={`${id}-mode`}
        voice={voice}
        onInsert={(value) => {
          onDraft({ prompt: value });
          inputRef.current?.focus();
        }}
      />
    </form>
  );
}

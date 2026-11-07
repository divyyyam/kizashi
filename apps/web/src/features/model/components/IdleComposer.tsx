"use client";

import { useId, useRef } from "react";
import { modelCopy } from "@/content/model-copy";
import type { FlightOrigin } from "@/features/model/hooks/use-flight";
import type { RunRequest } from "@/features/model/types";
import type { ComposerDraft } from "./composer-draft";
import { PromptForm } from "./PromptForm";
import { StarterPrompts } from "./StarterPrompts";

type IdleComposerProps = {
  readonly draft: ComposerDraft;
  readonly onDraft: (patch: Partial<ComposerDraft>) => void;
  readonly onRun: (request: RunRequest, origin: FlightOrigin) => void;
};

export function IdleComposer({ draft, onDraft, onRun }: IdleComposerProps) {
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  function pickStarter(prompt: string) {
    onDraft({ prompt });
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(prompt.length, prompt.length);
    });
  }
  return (
    <section
      aria-labelledby={id}
      className="model-idle mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 py-8 md:py-12"
    >
      <header className="model-intro mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <p className="text-label text-signal">{modelCopy.workspace.title}</p>
        <h1 id={id} className="font-display text-h1 text-text">
          {modelCopy.idle.title}
        </h1>
        <p className="max-w-2xl text-small text-text-muted">{modelCopy.idle.body}</p>
      </header>
      <PromptForm draft={draft} onDraft={onDraft} onRun={onRun} inputRef={input} />
      <StarterPrompts onPick={pickStarter} />
    </section>
  );
}

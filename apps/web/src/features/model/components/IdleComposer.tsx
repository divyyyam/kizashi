"use client";

import { useId } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
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
  return (
    <section
      aria-labelledby={id}
      className="model-idle model-rise mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 py-6 md:py-10"
    >
      <PageHeader
        className="mt-auto"
        eyebrow={modelCopy.workspace.title}
        title={modelCopy.idle.title}
        description={modelCopy.idle.body}
      />
      <PromptForm draft={draft} onDraft={onDraft} onRun={onRun} />
      <div className="mb-auto">
        <StarterPrompts onPick={(starter) => onDraft({ prompt: starter })} />
      </div>
    </section>
  );
}

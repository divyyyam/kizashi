import { MAX_PROMPT_CHARACTERS } from "@kizashi/schemas/engine";
import type { FormEvent, RefObject } from "react";
import { modelCopy } from "@/content/model-copy";
import { voiceCopy } from "@/content/model-voice-copy";
import type { useVoiceInput } from "../hooks/use-voice-input";
import { ComposerCapture } from "./ComposerCapture";

type ComposerPromptProps = {
  id: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  prompt: string;
  onPrompt: (prompt: string) => void;
  onSubmit: (event: FormEvent) => void;
  voice: ReturnType<typeof useVoiceInput>;
};

export function ComposerPrompt({
  id,
  inputRef,
  prompt,
  onPrompt,
  onSubmit,
  voice,
}: ComposerPromptProps) {
  const capturing = ["requesting", "recording", "transcribing"].includes(voice.status);
  const reviewing = voice.status === "review";
  return (
    <div className="model-prompt-area" data-capturing={capturing} data-reviewing={reviewing}>
      <div className="model-prompt-heading">
        <label htmlFor={id} className="text-small text-text-muted">
          {reviewing ? voiceCopy.review : modelCopy.idle.promptLabel}
        </label>
        {!reviewing ? (
          <span id={`${id}-count`} className="font-mono text-label tabular text-text-faint">
            {prompt.length} / {MAX_PROMPT_CHARACTERS}
          </span>
        ) : null}
      </div>
      <textarea
        ref={inputRef}
        id={id}
        rows={4}
        aria-describedby={reviewing ? undefined : `${id}-count ${id}-mode`}
        maxLength={reviewing ? undefined : MAX_PROMPT_CHARACTERS}
        value={reviewing ? voice.transcript : prompt}
        onChange={(event) =>
          reviewing ? voice.setTranscript(event.target.value) : onPrompt(event.target.value)
        }
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) onSubmit(event);
          if (event.key === "Escape" && (capturing || reviewing)) voice.cancel();
        }}
        disabled={capturing}
        placeholder={modelCopy.idle.promptPlaceholder}
        className="model-prompt-field text-body text-text placeholder:text-text-faint"
      />
      {capturing ? <ComposerCapture voice={voice} /> : null}
    </div>
  );
}

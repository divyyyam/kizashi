import { MAX_PROMPT_CHARACTERS } from "@kizashi/schemas/engine";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { voiceCopy } from "@/content/model-voice-copy";
import type { useVoiceInput } from "../hooks/use-voice-input";
import { appendTranscript } from "../lib/transcribe-voice";

type VoiceTranscriptProps = {
  voice: ReturnType<typeof useVoiceInput>;
  prompt: string;
  onInsert: (prompt: string) => void;
  disabled: boolean;
};

export function VoiceTranscript({ voice, prompt, onInsert, disabled }: VoiceTranscriptProps) {
  const id = useId();
  const result = appendTranscript(prompt, voice.transcript);
  const tooLong = result.length > MAX_PROMPT_CHARACTERS;
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-signal bg-bg p-4">
      <label htmlFor={id} className="text-small text-text">
        {voiceCopy.review}
      </label>
      <textarea
        id={id}
        rows={4}
        aria-label={voiceCopy.edit}
        value={voice.transcript}
        onChange={(event) => voice.setTranscript(event.target.value)}
        className="w-full resize-y bg-transparent text-small text-text outline-none focus-visible:ring-1 focus-visible:ring-signal"
      />
      {tooLong ? (
        <p role="status" className="text-small text-warning">
          {voiceCopy.tooLong}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled || tooLong || !voice.transcript.trim()}
          onClick={() => {
            onInsert(result);
            voice.cancel();
          }}
        >
          {voiceCopy.insert}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={voice.cancel}>
          {voiceCopy.discard}
        </Button>
      </div>
    </div>
  );
}

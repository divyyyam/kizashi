import { LoaderCircle, Mic, Square, X } from "lucide-react";
import { useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { voiceCopy } from "@/content/model-voice-copy";
import { useVoiceInput } from "../hooks/use-voice-input";
import { VoiceTranscript } from "./VoiceTranscript";

type VoiceInputProps = {
  prompt: string;
  onInsert: (prompt: string) => void;
  onBusy: (busy: boolean) => void;
  disabled: boolean;
};
export function VoiceInput({ prompt, onInsert, onBusy, disabled }: VoiceInputProps) {
  const voice = useVoiceInput();
  const id = useId();
  const active = ["requesting", "recording", "transcribing"].includes(voice.status);
  const busy = active || voice.status === "review";
  const unavailable = voice.status === "unavailable";
  const label = unavailable ? voice.message : voiceCopy.start;
  useEffect(() => {
    onBusy(busy);
    return () => onBusy(false);
  }, [busy, onBusy]);
  return (
    <div className="contents">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="size-10 rounded-full p-0"
        aria-label={label}
        title={label}
        aria-describedby={unavailable ? id : undefined}
        onClick={() => void voice.start()}
        disabled={disabled || busy || voice.status === "checking" || unavailable}
      >
        <Mic aria-hidden strokeWidth={1.5} className="size-4" />
      </Button>
      {unavailable ? (
        <span id={id} className="sr-only">
          {voice.message}
        </span>
      ) : null}
      {busy || voice.status === "error" ? (
        <VoiceFeedback voice={voice} prompt={prompt} onInsert={onInsert} disabled={disabled} />
      ) : null}
    </div>
  );
}

function VoiceFeedback({
  voice,
  prompt,
  onInsert,
  disabled,
}: Omit<VoiceInputProps, "onBusy"> & { voice: ReturnType<typeof useVoiceInput> }) {
  return (
    <div className="order-last flex w-full min-w-0 flex-col gap-3 border-t border-border pt-3">
      {voice.status === "review" ? (
        <VoiceTranscript voice={voice} prompt={prompt} onInsert={onInsert} disabled={disabled} />
      ) : voice.status === "error" ? (
        <p role="status" className="text-small text-warning">
          {voice.message}
        </p>
      ) : (
        <VoiceRecording voice={voice} />
      )}
      <p className="text-small text-text-faint">{voiceCopy.limit}</p>
      <p className="text-small text-text-faint">{voiceCopy.privacy}</p>
    </div>
  );
}

function VoiceRecording({ voice }: { voice: ReturnType<typeof useVoiceInput> }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="status">
      {voice.status === "recording" ? (
        <>
          <span className="font-mono text-small text-signal">
            {voiceCopy.recording} {voiceCopy.seconds(voice.seconds)}
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={voice.stop}>
            <Square aria-hidden className="size-3" />
            {voiceCopy.stop}
          </Button>
        </>
      ) : (
        <span className="flex items-center gap-2 text-small text-text-muted">
          <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />
          {voice.status === "requesting" ? voiceCopy.requesting : voiceCopy.transcribing}
        </span>
      )}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={voiceCopy.cancel}
        onClick={voice.cancel}
      >
        <X aria-hidden className="size-4" />
      </Button>
    </div>
  );
}

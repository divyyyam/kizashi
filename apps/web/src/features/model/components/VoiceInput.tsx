import { MAX_PROMPT_CHARACTERS } from "@kizashi/schemas/engine";
import { LoaderCircle, Mic, Square, X } from "lucide-react";
import { useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { voiceCopy } from "@/content/model-voice-copy";
import { useVoiceInput } from "../hooks/use-voice-input";
import { appendTranscript } from "../lib/transcribe-voice";

type VoiceInputProps = { prompt: string; onInsert: (prompt: string) => void; onBusy: (busy: boolean) => void; disabled: boolean };
export function VoiceInput({ prompt, onInsert, onBusy, disabled }: VoiceInputProps) {
  const voice = useVoiceInput();
  const id = useId();
  const active = ["requesting", "recording", "transcribing"].includes(voice.status);
  useEffect(() => { onBusy(active); return () => onBusy(false); }, [active, onBusy]);
  const result = appendTranscript(prompt, voice.transcript);
  const tooLong = result.length > MAX_PROMPT_CHARACTERS;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={() => void voice.start()} disabled={disabled || active || voice.status === "checking" || voice.status === "unavailable" || voice.status === "review"}>
          <Mic aria-hidden className="size-4" />{voiceCopy.start}
        </Button>
        {active ? <VoiceRecording voice={voice} /> : <p className="text-small text-text-faint">{voiceCopy.limit}</p>}
      </div>
      {voice.status === "error" || voice.status === "unavailable" ? <p role="status" className="text-small text-warning">{voice.message}</p> : null}
      {voice.status === "review" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-signal bg-bg p-4">
          <label htmlFor={id} className="text-small text-text">{voiceCopy.review}</label>
          <textarea id={id} rows={4} aria-label={voiceCopy.edit} value={voice.transcript} onChange={(event) => voice.setTranscript(event.target.value)} className="w-full resize-y bg-transparent text-small text-text outline-none focus-visible:ring-1 focus-visible:ring-signal" />
          {tooLong ? <p role="status" className="text-small text-warning">{voiceCopy.tooLong}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={disabled || tooLong || !voice.transcript.trim()} onClick={() => { onInsert(result); voice.cancel(); }}>{voiceCopy.insert}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={voice.cancel}>{voiceCopy.discard}</Button>
          </div>
        </div>
      ) : null}
      <p className="text-small text-text-faint">{voiceCopy.privacy}</p>
    </div>
  );
}

function VoiceRecording({ voice }: { voice: ReturnType<typeof useVoiceInput> }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="status">
      {voice.status === "recording" ? <>
        <span className="font-mono text-small text-signal">{voiceCopy.recording} {voiceCopy.seconds(voice.seconds)}</span>
        <Button type="button" size="sm" variant="secondary" onClick={voice.stop}><Square aria-hidden className="size-3" />{voiceCopy.stop}</Button>
      </> : <span className="flex items-center gap-2 text-small text-text-muted"><LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />{voice.status === "requesting" ? voiceCopy.requesting : voiceCopy.transcribing}</span>}
      <Button type="button" size="sm" variant="ghost" aria-label={voiceCopy.cancel} onClick={voice.cancel}><X aria-hidden className="size-4" /></Button>
    </div>
  );
}

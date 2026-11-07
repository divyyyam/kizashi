import { Mic, Square } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { voiceCopy } from "@/content/model-voice-copy";
import type { useVoiceInput } from "../hooks/use-voice-input";

export function ComposerMic({ voice }: { voice: ReturnType<typeof useVoiceInput> }) {
  const id = useId();
  const recording = voice.status === "recording";
  const unavailable = voice.status === "unavailable";
  const label = unavailable ? voice.message : recording ? voiceCopy.stop : voiceCopy.start;
  const Icon = recording ? Square : Mic;
  return (
    <span
      className="inline-flex"
      title={unavailable ? voice.message : `${label}. ${voiceCopy.privacy}`}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={label}
        aria-describedby={id}
        className="model-mic-button size-11 rounded-full p-0"
        data-recording={recording}
        disabled={unavailable || ["checking", "requesting", "transcribing"].includes(voice.status)}
        onClick={() => (recording ? voice.stop() : void voice.start())}
      >
        <Icon aria-hidden strokeWidth={1.5} className="size-4" />
      </Button>
      <span id={id} className="sr-only">
        {unavailable ? voice.message : voiceCopy.privacy}
      </span>
    </span>
  );
}

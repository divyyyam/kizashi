import { LoaderCircle, Mic } from "lucide-react";
import { voiceCopy } from "@/content/model-voice-copy";
import type { useVoiceInput } from "../hooks/use-voice-input";

export function ComposerCapture({ voice }: { voice: ReturnType<typeof useVoiceInput> }) {
  const recording = voice.status === "recording";
  const Icon = voice.status === "transcribing" ? LoaderCircle : Mic;
  return (
    <div className="model-capture-status" role="status">
      <span className="model-capture-icon" data-recording={recording}>
        <Icon
          aria-hidden
          strokeWidth={1.5}
          className={voice.status === "transcribing" ? "size-5 motion-safe:animate-spin" : "size-5"}
        />
      </span>
      <p className="text-small text-text-muted">
        {recording
          ? voiceCopy.recording
          : voice.status === "requesting"
            ? voiceCopy.requesting
            : voiceCopy.transcribing}
      </p>
      {recording ? (
        <span className="font-mono text-small tabular text-signal">
          {voiceCopy.seconds(voice.seconds)}
        </span>
      ) : null}
    </div>
  );
}

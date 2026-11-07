import { ArrowUp, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { modelCopy } from "@/content/model-copy";
import { voiceCopy } from "@/content/model-voice-copy";
import type { useVoiceInput } from "../hooks/use-voice-input";
import { ComposerMic } from "./ComposerMic";

type ComposerActionsProps = {
  voice: ReturnType<typeof useVoiceInput>;
  ready: boolean;
  canInsert: boolean;
  onInsert: () => void;
};

export function ComposerActions({ voice, ready, canInsert, onInsert }: ComposerActionsProps) {
  const reviewing = voice.status === "review";
  const active = ["requesting", "recording", "transcribing"].includes(voice.status);
  return (
    <div className="flex shrink-0 items-center gap-1">
      {!reviewing ? <ComposerMic voice={voice} /> : null}
      {active || reviewing ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-11 rounded-full p-0"
          aria-label={reviewing ? voiceCopy.discard : voiceCopy.cancel}
          onClick={voice.cancel}
        >
          <X aria-hidden strokeWidth={1.5} className="size-4" />
        </Button>
      ) : null}
      {reviewing ? (
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          disabled={!canInsert}
          onClick={onInsert}
        >
          <Check aria-hidden strokeWidth={1.5} className="size-4" />
          {voiceCopy.insert}
        </Button>
      ) : !active ? (
        <Button
          type="submit"
          disabled={!ready}
          className="model-run-button size-11 rounded-full p-0"
          aria-label={modelCopy.idle.run}
          title={modelCopy.idle.run}
        >
          <ArrowUp aria-hidden strokeWidth={1.5} className="size-5" />
        </Button>
      ) : null}
    </div>
  );
}

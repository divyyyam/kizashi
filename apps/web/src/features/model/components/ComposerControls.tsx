import { MAX_PROMPT_CHARACTERS } from "@kizashi/schemas/engine";
import { modelCopy } from "@/content/model-copy";
import { voiceCopy } from "@/content/model-voice-copy";
import type { useVoiceInput } from "../hooks/use-voice-input";
import { parseBudgetUsdc } from "../lib/money";
import { appendTranscript } from "../lib/transcribe-voice";
import { ComposerActions } from "./ComposerActions";
import { ComposerSettings } from "./ComposerSettings";
import type { ComposerDraft } from "./composer-draft";
import { MODE_HELP } from "./mode-labels";

type ComposerControlsProps = {
  readonly draft: ComposerDraft;
  readonly onDraft: (patch: Partial<ComposerDraft>) => void;
  readonly ready: boolean;
  readonly id: string;
  readonly voice: ReturnType<typeof useVoiceInput>;
  readonly onInsert: (prompt: string) => void;
};

export function ComposerControls({
  draft,
  onDraft,
  ready,
  id,
  voice,
  onInsert,
}: ComposerControlsProps) {
  const reviewing = voice.status === "review";
  const result = appendTranscript(draft.prompt, voice.transcript);
  const tooLong = reviewing && result.length > MAX_PROMPT_CHARACTERS;
  const budgetIssue = parseBudgetUsdc(draft.budget) === null ? modelCopy.budget.invalid : null;
  const notice =
    voice.status === "error" ? voice.message : tooLong ? voiceCopy.tooLong : budgetIssue;
  return (
    <>
      <div className="model-composer-toolbar" data-reviewing={reviewing}>
        {!reviewing ? <ComposerSettings draft={draft} onDraft={onDraft} /> : null}
        <ComposerActions
          voice={voice}
          ready={ready}
          canInsert={!tooLong && Boolean(voice.transcript.trim())}
          onInsert={() => {
            onInsert(result);
            voice.cancel();
          }}
        />
      </div>
      <div className="model-composer-note text-small text-text-faint">
        <p
          id={id}
          role={notice ? "alert" : undefined}
          className={notice ? "text-warning" : undefined}
        >
          {notice ?? MODE_HELP[draft.mode]}
        </p>
        <span className="hidden shrink-0 md:inline">{modelCopy.workspace.shortcut}</span>
      </div>
    </>
  );
}

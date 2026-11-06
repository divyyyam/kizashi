import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { modelCopy } from "@/content/model-copy";
import { BudgetChip } from "./BudgetChip";
import type { ComposerDraft } from "./composer-draft";
import { ModeToggle } from "./ModeToggle";
import { MODE_HELP } from "./mode-labels";
import { RulesChip } from "./RulesChip";

type ComposerControlsProps = {
  readonly draft: ComposerDraft;
  readonly onDraft: (patch: Partial<ComposerDraft>) => void;
  readonly ready: boolean;
  readonly id: string;
};

export function ComposerControls({ draft, onDraft, ready, id }: ComposerControlsProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <RulesChip file={draft.rulesFile} onChange={(rulesFile) => onDraft({ rulesFile })} />
        <BudgetChip value={draft.budget} onChange={(budget) => onDraft({ budget })} />
        <ModeToggle mode={draft.mode} onChange={(mode) => onDraft({ mode })} describedBy={id} />
        <Button type="submit" disabled={!ready} className="ml-auto">
          {modelCopy.idle.run}
          <ArrowUp aria-hidden strokeWidth={1.5} className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-small text-text-faint">
        <p id={id}>{MODE_HELP[draft.mode]}</p>
        <span className="hidden sm:inline">{modelCopy.workspace.shortcut}</span>
      </div>
    </>
  );
}

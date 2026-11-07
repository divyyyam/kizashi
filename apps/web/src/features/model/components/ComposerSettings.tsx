import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, Paperclip, SlidersHorizontal, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { modelCopy } from "@/content/model-copy";
import { formatUsdcAsUsd, parseBudgetUsdc } from "../lib/money";
import { BudgetChip } from "./BudgetChip";
import type { ComposerDraft } from "./composer-draft";
import { ModeToggle } from "./ModeToggle";
import { MODE_HELP, MODE_LABELS } from "./mode-labels";
import { RulesChip } from "./RulesChip";

type ComposerSettingsProps = {
  draft: ComposerDraft;
  onDraft: (patch: Partial<ComposerDraft>) => void;
};

export function ComposerSettings({ draft, onDraft }: ComposerSettingsProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div className="min-w-0">
        <SettingsTrigger draft={draft} />
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="model-settings-overlay" />
        <Dialog.Content
          className="model-settings-panel"
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              event.target instanceof HTMLInputElement &&
              event.target.type === "text"
            ) {
              event.preventDefault();
              setOpen(false);
            }
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-small text-text">
              {modelCopy.workspace.settings}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-10 p-0"
                aria-label={modelCopy.workspace.closeSettings}
              >
                <X aria-hidden className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <RulesChip file={draft.rulesFile} onChange={(rulesFile) => onDraft({ rulesFile })} />
          <BudgetChip value={draft.budget} onChange={(value) => onDraft({ budget: value })} />
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-small text-text-muted">{modelCopy.mode.label}</p>
            <ModeToggle mode={draft.mode} onChange={(mode) => onDraft({ mode })} describedBy={id} />
          </div>
          <Dialog.Description id={id} className="text-small text-text-muted">
            {MODE_HELP[draft.mode]}
          </Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SettingsTrigger({ draft }: { draft: ComposerDraft }) {
  const budget = parseBudgetUsdc(draft.budget);
  return (
    <Dialog.Trigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="model-settings-trigger rounded-full"
        aria-label={modelCopy.workspace.settings}
        title={modelCopy.workspace.settings}
      >
        <SlidersHorizontal aria-hidden strokeWidth={1.5} className="size-4 shrink-0" />
        <span className="min-w-0 truncate">{MODE_LABELS[draft.mode]}</span>
        <span
          className={budget === null ? "shrink-0 text-warning" : "shrink-0 tabular text-text-muted"}
        >
          {budget === null ? modelCopy.budget.label : formatUsdcAsUsd(budget)}
        </span>
        {draft.rulesFile ? (
          <Paperclip aria-label={draft.rulesFile.name} className="size-3.5 shrink-0 text-signal" />
        ) : null}
        <ChevronDown aria-hidden className="model-settings-chevron size-3 shrink-0" />
      </Button>
    </Dialog.Trigger>
  );
}

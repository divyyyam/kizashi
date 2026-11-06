import { modelCopy } from "@/content/model-copy";
import { cn } from "@/lib/cn";
import type { EngineMode } from "../types";
import { MODE_LABELS } from "./mode-labels";

const MODES: readonly EngineMode[] = ["suggest", "auto"];

type ModeToggleProps = {
  readonly mode: EngineMode;
  readonly onChange: (mode: EngineMode) => void;
  readonly describedBy: string;
};

/** Suggest (approve each trade) or Autonomous (the engine trades within budget). */
export function ModeToggle({ mode, onChange, describedBy }: ModeToggleProps) {
  return (
    <fieldset
      aria-describedby={describedBy}
      className="inline-flex h-10 items-center rounded-full border border-border bg-bg"
    >
      <legend className="sr-only">{modelCopy.mode.label}</legend>
      {MODES.map((option) => (
        <button
          type="button"
          key={option}
          aria-pressed={mode === option}
          onClick={() => onChange(option)}
          className={cn(
            "h-full rounded-full px-4 text-small transition-colors duration-(--motion-quick)",
            mode === option ? "bg-surface-raised text-text" : "text-text-muted hover:text-text",
          )}
        >
          {MODE_LABELS[option]}
        </button>
      ))}
    </fieldset>
  );
}

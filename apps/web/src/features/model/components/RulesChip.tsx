import { FileText, Paperclip, X } from "lucide-react";
import { useId } from "react";
import { modelCopy } from "@/content/model-copy";
import { cn } from "@/lib/cn";
import { CHIP_CLASS } from "./chip-class";

const RULE_FILE_TYPES = ".json,.pdf,application/json,application/pdf";

type RulesChipProps = {
  readonly file: File | null;
  readonly onChange: (file: File | null) => void;
};

/** Attach a JSON or PDF rule set; once attached, the chip names the file and can remove it. */
export function RulesChip({ file, onChange }: RulesChipProps) {
  const id = useId();
  if (file !== null) {
    return (
      <span className={cn(CHIP_CLASS, "pr-0")}>
        <FileText aria-hidden strokeWidth={1.5} className="size-4 text-text-muted" />
        <span className="max-w-40 truncate">{file.name}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={modelCopy.rules.remove(file.name)}
          className="grid size-10 place-items-center rounded-full text-text-muted hover:text-text"
        >
          <X aria-hidden strokeWidth={1.5} className="size-4" />
        </button>
      </span>
    );
  }
  return (
    <label
      htmlFor={id}
      className={cn(
        CHIP_CLASS,
        "cursor-pointer hover:border-border-strong has-focus-visible:border-accent",
      )}
    >
      <Paperclip aria-hidden strokeWidth={1.5} className="size-4 text-text-muted" />
      {modelCopy.rules.attach}
      <span className="text-text-faint">{modelCopy.rules.accept}</span>
      <input
        id={id}
        type="file"
        accept={RULE_FILE_TYPES}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </label>
  );
}

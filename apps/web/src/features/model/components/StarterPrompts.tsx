import { ArrowUpLeft } from "lucide-react";
import { modelCopy } from "@/content/model-copy";

type StarterPromptsProps = {
  readonly onPick: (prompt: string) => void;
};

export function StarterPrompts({ onPick }: StarterPromptsProps) {
  return (
    <section aria-label={modelCopy.idle.startersLabel} className="model-starters space-y-3">
      <h2 className="text-label text-text-faint">{modelCopy.idle.startersLabel}</h2>
      <ul className="grid gap-2 md:grid-cols-3">
        {modelCopy.idle.starters.map((starter, index) => (
          <li key={starter}>
            <button
              type="button"
              onClick={() => onPick(starter)}
              title={starter}
              className="model-starter-button flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-left text-small text-text-muted hover:border-border-strong hover:bg-surface hover:text-text focus-visible:outline-1 focus-visible:outline-accent"
            >
              {modelCopy.idle.starterLabels[index]}
              <ArrowUpLeft
                aria-hidden
                strokeWidth={1.5}
                className="size-4 shrink-0 text-text-faint"
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

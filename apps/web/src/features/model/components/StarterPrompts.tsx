import { ArrowUpRight } from "lucide-react";
import { modelCopy } from "@/content/model-copy";

type StarterPromptsProps = {
  readonly onPick: (prompt: string) => void;
};

export function StarterPrompts({ onPick }: StarterPromptsProps) {
  return (
    <section aria-label={modelCopy.idle.startersLabel} className="flex flex-col gap-3">
      <p className="text-label text-text-faint">{modelCopy.idle.startersLabel}</p>
      <ul className="grid gap-2 sm:grid-cols-3">
        {modelCopy.idle.starters.map((starter, index) => (
          <li key={starter}>
            <button
              type="button"
              onClick={() => onPick(starter)}
              title={starter}
              className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-3 text-left text-small text-text-muted transition-colors hover:border-border-strong hover:text-text"
            >
              {modelCopy.idle.starterLabels[index]}
              <ArrowUpRight
                aria-hidden
                strokeWidth={1.5}
                className="size-4 shrink-0 text-text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

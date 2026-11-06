"use client";

import { useRef } from "react";
import { modelCopy } from "@/content/model-copy";
import { type FlightOrigin, useFlight } from "@/features/model/hooks/use-flight";
import { formatUsdcAsUsd } from "@/features/model/lib/money";
import type { RunRequest } from "@/features/model/types";
import { MODE_LABELS } from "./mode-labels";

type AskCardProps = {
  readonly request: RunRequest;
  readonly origin: FlightOrigin | null;
};

export function AskCard({ request, origin }: AskCardProps) {
  const frame = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useFlight(frame, content, origin);
  const facts = [
    { label: modelCopy.ask.rules, value: request.rulesFileName ?? modelCopy.rules.none },
    { label: modelCopy.ask.budget, value: formatUsdcAsUsd(request.budgetUsdc) },
  ];
  return (
    <section ref={frame} aria-label={modelCopy.ask.title} className="origin-top-left py-2">
      <div ref={content} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-label text-text-faint">{modelCopy.ask.title}</p>
          <span className="text-small text-text-muted">{MODE_LABELS[request.mode]}</span>
        </div>
        <p className="max-h-32 overflow-y-auto break-words text-small text-text">
          {request.prompt}
        </p>
        <details className="border-t border-border pt-1">
          <summary className="cursor-pointer py-2 text-small text-text-muted hover:text-text">
            {modelCopy.workspace.settings}
          </summary>
          <dl className="grid gap-2 py-2 text-small">
            {facts.map((fact) => (
              <div key={fact.label} className="flex justify-between gap-3">
                <dt className="text-text-muted">{fact.label}</dt>
                <dd className="min-w-0 break-all tabular text-text">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </section>
  );
}

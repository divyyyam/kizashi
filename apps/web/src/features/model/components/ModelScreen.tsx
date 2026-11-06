"use client";

import "./model.css";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workspaceCopy as text } from "@/content/model-workspace-copy";
import { useEngineHealth } from "../hooks/use-engine-health";
import { useEngineSession } from "../hooks/use-engine-session";
import { RunConsole } from "./RunConsole";
import { StrategyComposer } from "./StrategyComposer";

export function ModelScreen() {
  const session = useEngineSession();
  const health = useEngineHealth();
  return (
    <div className="model-studio flex min-h-0 flex-1 flex-col gap-5 py-3">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-2 text-label uppercase text-signal">{text.eyebrow}</p>
          <h1 className="font-display text-h1 text-text">{text.title}</h1>
          <p className="mt-3 text-small text-text-muted">{text.description}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
          <span role="status" className="flex items-center gap-2 text-small text-text-muted">
            <span
              aria-hidden
              className={
                health.status === "connected"
                  ? "size-1.5 rounded-full bg-saved"
                  : "size-1.5 rounded-full bg-warning"
              }
            />
            {text[health.status]}
          </span>
          {health.status === "offline" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={text.retry}
              onClick={health.retry}
            >
              <RefreshCw aria-hidden className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </header>
      <div className="model-studio-grid grid min-h-0 flex-1 gap-5">
        <StrategyComposer session={session} />
        <RunConsole session={session} />
      </div>
    </div>
  );
}

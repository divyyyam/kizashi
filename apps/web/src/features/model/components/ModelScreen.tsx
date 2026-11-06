"use client";

import "./model.css";
import { useCallback, useState } from "react";
import { useEngineRun } from "../hooks/use-engine-run";
import type { FlightOrigin } from "../hooks/use-flight";
import { liveRunAdapter } from "../lib/live-run-adapter";
import type { RunRequest } from "../types";
import { type ComposerDraft, INITIAL_DRAFT } from "./composer-draft";
import { IdleComposer } from "./IdleComposer";
import { RunView } from "./RunView";

export function ModelScreen() {
  const run = useEngineRun(liveRunAdapter);
  const [draft, setDraft] = useState<ComposerDraft>(INITIAL_DRAFT);
  const [origin, setOrigin] = useState<FlightOrigin | null>(null);
  const patchDraft = useCallback(
    (patch: Partial<ComposerDraft>) => setDraft((current) => ({ ...current, ...patch })),
    [],
  );
  const { start } = run;
  const begin = useCallback(
    (request: RunRequest, from: FlightOrigin) => {
      setOrigin(from);
      start(request);
    },
    [start],
  );

  if (run.state.status === "idle" || run.state.request === null) {
    return <IdleComposer draft={draft} onDraft={patchDraft} onRun={begin} />;
  }
  return (
    <RunView
      state={run.state}
      request={run.state.request}
      origin={origin}
      onNewRun={run.reset}
      onSettle={run.settle}
    />
  );
}

"use client";

import { useState } from "react";
import { modelCopy } from "@/content/model-copy";
import type { FlightOrigin } from "@/features/model/hooks/use-flight";
import type { RunState, Settlement } from "@/features/model/lib/run-reducer";
import type { RunRequest } from "@/features/model/types";
import { AskCard } from "./AskCard";
import { PickPanels } from "./PickPanels";
import { RunHeader } from "./RunHeader";
import { ThinkingSteps } from "./ThinkingSteps";

type RunViewProps = {
  readonly state: RunState;
  readonly request: RunRequest;
  readonly origin: FlightOrigin | null;
  readonly onNewRun: () => void;
  readonly onSettle: (settlement: Settlement) => void;
};

export function RunView({ state, request, origin, onNewRun, onSettle }: RunViewProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="model-workspace flex min-h-0 flex-col gap-3 pt-3">
      <RunHeader
        state={state}
        request={request}
        onNewRun={onNewRun}
        focused={focused}
        onFocus={() => setFocused(!focused)}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        {state.status === "unavailable" ? (
          <section
            role="status"
            className="flex min-w-0 shrink-0 flex-col gap-1 rounded-md border border-border p-3"
          >
            <h2 className="text-small text-warning">{modelCopy.unavailable.title}</h2>
            <p className="max-w-lg text-small text-text-muted">{modelCopy.unavailable.body}</p>
          </section>
        ) : null}
        <PickPanels
          state={state}
          request={request}
          onSettle={onSettle}
          focused={focused}
          context={
            <div className="flex flex-col gap-6">
              <AskCard request={request} origin={origin} />
              <ThinkingSteps steps={state.steps} />
            </div>
          }
        />
      </div>
    </div>
  );
}

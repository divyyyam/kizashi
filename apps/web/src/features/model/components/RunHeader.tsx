import { Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { modelCopy } from "@/content/model-copy";
import { formatUsdcAsUsd } from "@/features/model/lib/money";
import { budgetLeftUsdc, type RunState } from "@/features/model/lib/run-reducer";
import type { RunRequest } from "@/features/model/types";
import { RunStatus } from "./RunStatus";

type RunHeaderProps = {
  readonly state: RunState;
  readonly request: RunRequest;
  readonly onNewRun: () => void;
  readonly focused: boolean;
  readonly onFocus: () => void;
};

export function RunHeader({ state, request, onNewRun, focused, onFocus }: RunHeaderProps) {
  const FocusIcon = focused ? Minimize2 : Maximize2;
  const text = modelCopy.workspace;
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-1">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-3xl leading-none text-text">{text.title}</h1>
        <RunStatus state={state} />
      </div>
      <div className="flex items-center gap-4">
        <p className="flex items-baseline gap-2 text-small">
          <span className="text-text-muted">{modelCopy.budget.left}</span>
          <span className="tabular text-text">{formatUsdcAsUsd(budgetLeftUsdc(state))}</span>
          <span className="hidden tabular text-text-faint xl:inline">
            {modelCopy.budget.of(formatUsdcAsUsd(request.budgetUsdc))}
          </span>
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFocus}
          aria-pressed={focused}
          aria-label={focused ? text.restore : text.focus}
          title={focused ? text.restore : text.focus}
          className="w-10 p-0"
        >
          <FocusIcon aria-hidden strokeWidth={1.5} className="size-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={onNewRun}>
          <RotateCcw aria-hidden strokeWidth={1.5} className="size-3.5" />
          {modelCopy.ask.newRun}
        </Button>
      </div>
    </header>
  );
}

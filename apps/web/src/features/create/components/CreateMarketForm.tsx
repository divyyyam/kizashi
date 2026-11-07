"use client";

import { useCreateForm } from "../hooks/use-create-form";
import { STEPS } from "../types";
import { CreateNavigation } from "./CreateNavigation";
import { CreateProgressPanel } from "./CreateProgressPanel";
import { CreateSteps } from "./CreateSteps";
import { MarketPreview } from "./MarketPreview";

export function CreateMarketForm() {
  const state = useCreateForm();
  const { form, step, setStep, values, action, busy, done } = state;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-12">
      <form
        noValidate
        aria-busy={busy}
        className="grid min-w-0 content-start gap-7 rounded-xl border border-border bg-surface p-5 md:p-8 lg:col-span-8"
        onSubmit={(event) => {
          event.preventDefault();
          void state.next();
        }}
      >
        <ol className="flex flex-wrap gap-x-5 gap-y-2 border-b border-border">
          {STEPS.map((name, index) => (
            <li key={name}>
              <button
                type="button"
                disabled={busy || done || index > step}
                onClick={() => setStep(index)}
                aria-current={index === step ? "step" : undefined}
                className={
                  index === step
                    ? "min-h-11 border-b border-signal py-3 text-small text-text"
                    : "min-h-11 py-3 text-small text-text-faint enabled:hover:text-text-muted"
                }
              >
                {index + 1}. {name}
              </button>
            </li>
          ))}
        </ol>
        <fieldset disabled={busy || done} className="grid min-w-0 gap-5">
          <CreateSteps step={step} form={form} values={values} />
        </fieldset>
        <CreateNavigation state={state} />
        <CreateProgressPanel
          progress={action.progress}
          retrying={action.isRetrying}
          onRetryListing={() => void action.retryListing()}
        />
      </form>
      <div className="min-w-0 lg:sticky lg:top-24 lg:col-span-4">
        <MarketPreview values={values} />
      </div>
    </div>
  );
}

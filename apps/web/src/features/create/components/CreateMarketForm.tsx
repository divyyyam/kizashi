"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useCreateMarket } from "../hooks/use-create-market";
import type { PreparedImage } from "../lib/image";
import { type CreateFormValues, createFormSchema, STEP_FIELDS, STEPS } from "../types";
import { CreateProgressPanel } from "./CreateProgressPanel";
import { CreateSteps } from "./CreateSteps";
import { MarketPreview } from "./MarketPreview";

const DEFAULTS: CreateFormValues = {
  question: "",
  description: "",
  category: "crypto",
  tags: "",
  kind: "binary",
  yesLabel: "Yes",
  noLabel: "No",
  unit: "",
  low: "",
  high: "",
  buckets: "10",
  closesAt: "",
  source: "manual",
  sourceName: "",
  sourceUrl: "",
  criteria: "",
  edgeCases: "",
  subsidy: "10",
};

export function CreateMarketForm() {
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: DEFAULTS,
    mode: "onBlur",
  });
  const values = { ...DEFAULTS, ...useWatch({ control: form.control }) } as CreateFormValues;
  const [step, setStep] = useState(0);
  const [image, setImage] = useState<PreparedImage>();
  const action = useCreateMarket();
  const last = step === STEPS.length - 1;
  const busy = action.progress.phase === "running";
  const done = action.progress.phase === "done";

  async function next() {
    const fields = STEP_FIELDS[step] ?? [];
    if (!(await form.trigger(fields, { shouldFocus: true }))) return;
    if (!last) {
      setStep(step + 1);
      return;
    }
    const ok = await form.trigger(undefined, { shouldFocus: true });
    if (!ok) {
      const firstBad = STEP_FIELDS.findIndex((group) =>
        group.some((f) => form.formState.errors[f]),
      );
      if (firstBad >= 0) setStep(firstBad);
      return;
    }
    await action.create(form.getValues(), image);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form
        noValidate
        className="grid content-start gap-7"
        onSubmit={(event) => {
          event.preventDefault();
          void next();
        }}
      >
        <ol className="flex flex-wrap gap-4 border-b border-border">
          {STEPS.map((name, i) => (
            <li key={name}>
              <button
                type="button"
                disabled={busy || i > step}
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className={
                  i === step
                    ? "border-b border-signal py-3 text-text"
                    : "py-3 text-text-faint enabled:hover:text-text-muted"
                }
              >
                {i + 1}. {name}
              </button>
            </li>
          ))}
        </ol>
        <fieldset disabled={busy || done} className="grid gap-5">
          <CreateSteps step={step} form={form} values={values} image={image} onImage={setImage} />
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          {step > 0 && !done ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          ) : null}
          {!done ? (
            <Button type="submit" disabled={busy || (last && !action.ready)}>
              {last ? (busy ? "Creating…" : "Create market") : "Next"}
            </Button>
          ) : null}
          {last && action.reason ? (
            <p className="text-small text-text-muted">{action.reason}</p>
          ) : null}
        </div>
        <CreateProgressPanel
          progress={action.progress}
          hasImage={Boolean(image)}
          onRetryListing={() => void action.retryListing()}
        />
      </form>
      <MarketPreview values={values} image={image} />
    </div>
  );
}

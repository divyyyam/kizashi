"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { CREATE_DEFAULTS } from "../lib/form-defaults";
import { type CreateFormValues, createFormSchema, STEP_FIELDS, STEPS } from "../types";
import { useCreateMarket } from "./use-create-market";

export function useCreateForm() {
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: CREATE_DEFAULTS,
    mode: "onBlur",
  });
  const values = { ...CREATE_DEFAULTS, ...useWatch({ control: form.control }) } as CreateFormValues;
  const [step, setStep] = useState(0);
  const action = useCreateMarket();
  const last = step === STEPS.length - 1;
  const busy = action.progress.phase === "running";
  const done = action.progress.phase === "done";
  async function next() {
    if (busy || done) return;
    if (!(await form.trigger(STEP_FIELDS[step] ?? [], { shouldFocus: true }))) return;
    if (!last) {
      setStep(step + 1);
      return;
    }
    if (!(await form.trigger(undefined, { shouldFocus: true }))) {
      const firstBad = STEP_FIELDS.findIndex((group) =>
        group.some((field) => form.formState.errors[field]),
      );
      if (firstBad >= 0) setStep(firstBad);
      return;
    }
    await action.create(form.getValues());
  }
  return { form, values, step, setStep, action, last, busy, done, next };
}

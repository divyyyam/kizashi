"use client";

import { deploymentByChainId } from "@kizashi/contracts";
import { MARKET_CATEGORIES } from "@kizashi/schemas/market";
import type { UseFormReturn } from "react-hook-form";
import { NativeSelect } from "@/components/ui/select";
import { appChain } from "@/lib/wagmi";
import type { PreparedImage } from "../lib/image";
import type { CreateFormValues } from "../types";
import { Field, inputClass } from "./Field";
import { ImagePicker } from "./ImagePicker";

const CATEGORY_LABEL: Record<(typeof MARKET_CATEGORIES)[number], string> = {
  crypto: "Crypto",
  sports: "Sports",
  politics: "Politics",
  economics: "Economics",
  tech: "Tech",
  culture: "Culture",
  science: "Science",
  other: "Other",
};

type Props = {
  step: number;
  form: UseFormReturn<CreateFormValues>;
  values: CreateFormValues;
  image: PreparedImage | undefined;
  onImage: (image: PreparedImage | undefined) => void;
};

export function CreateSteps({ step, form, values, image, onImage }: Props) {
  const { register, formState } = form;
  const e = formState.errors;
  const twap = deploymentByChainId(appChain.id)?.twap;

  if (step === 0)
    return (
      <div className="grid gap-5">
        <Field
          label="Question"
          help="Ask one clear, verifiable question. Example: Will ETH close above $5,000 on 31 Dec 2026?"
          error={e.question?.message}
        >
          {(p) => (
            <input
              {...register("question")}
              {...p}
              className={inputClass}
              placeholder="Will … by …?"
            />
          )}
        </Field>
        <Field
          label="Description"
          help="Context traders need: background, why it matters, links."
          error={e.description?.message}
        >
          {(p) => <textarea {...register("description")} {...p} rows={4} className={inputClass} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" error={e.category?.message}>
            {(p) => (
              <NativeSelect {...register("category")} {...p}>
                {MARKET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Tags" help="Comma separated, up to 5" error={e.tags?.message}>
            {(p) => (
              <input
                {...register("tags")}
                {...p}
                className={inputClass}
                placeholder="eth, price, 2026"
              />
            )}
          </Field>
        </div>
        <ImagePicker image={image} onImage={onImage} />
      </div>
    );

  if (step === 1)
    return (
      <div className="grid gap-5">
        <Field
          label="Market type"
          help={
            values.kind === "binary"
              ? "Two outcomes. Each share pays 1 USDC if its side wins."
              : "A numeric range split into equal buckets. Traders shape a distribution over it."
          }
          error={e.kind?.message}
        >
          {(p) => (
            <NativeSelect {...register("kind")} {...p}>
              <option value="binary">Yes / No</option>
              <option value="curve">Numeric range</option>
            </NativeSelect>
          )}
        </Field>
        {values.kind === "binary" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="YES outcome" error={e.yesLabel?.message}>
              {(p) => <input {...register("yesLabel")} {...p} className={inputClass} />}
            </Field>
            <Field label="NO outcome" error={e.noLabel?.message}>
              {(p) => <input {...register("noLabel")} {...p} className={inputClass} />}
            </Field>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Unit" error={e.unit?.message}>
              {(p) => (
                <input {...register("unit")} {...p} className={inputClass} placeholder="USD" />
              )}
            </Field>
            <Field label="Number of ranges" help="2–64 equal steps" error={e.buckets?.message}>
              {(p) => (
                <input
                  {...register("buckets")}
                  {...p}
                  className={`${inputClass} tabular`}
                  inputMode="numeric"
                />
              )}
            </Field>
            <Field
              label="Low end"
              help="Values below fall in the first range"
              error={e.low?.message}
            >
              {(p) => (
                <input
                  {...register("low")}
                  {...p}
                  className={`${inputClass} tabular`}
                  inputMode="decimal"
                />
              )}
            </Field>
            <Field
              label="High end"
              help="Values above fall in the last range"
              error={e.high?.message}
            >
              {(p) => (
                <input
                  {...register("high")}
                  {...p}
                  className={`${inputClass} tabular`}
                  inputMode="decimal"
                />
              )}
            </Field>
          </div>
        )}
      </div>
    );

  if (step === 2)
    return (
      <div className="grid gap-5">
        <Field
          label="Trading closes and the market expires"
          help="Resolution happens after this time."
          error={e.closesAt?.message}
        >
          {(p) => (
            <input
              {...register("closesAt")}
              {...p}
              type="datetime-local"
              className={`${inputClass} tabular`}
            />
          )}
        </Field>
        <Field
          label="Resolution source"
          help={
            values.source === "manual"
              ? "The resolver proposes the outcome after close; anyone holding a position can dispute it for 30 minutes before it's final."
              : `Settled automatically from the Uniswap v4 time-weighted average price of the ${twap?.baseSymbol ?? "oracle"}/USDC pool over the last ${Math.round((twap?.window ?? 0) / 60)} minutes before close. Falls back to manual resolution if the pool had too few swaps or too little liquidity.`
          }
          error={e.source?.message}
        >
          {(p) => (
            <NativeSelect {...register("source")} {...p}>
              <option value="manual">Resolver with dispute window</option>
              <option value="uniswap-twap" disabled={!twap || values.kind !== "curve"}>
                Uniswap v4 TWAP oracle{twap ? ` (${twap.baseSymbol}/USDC)` : " (unavailable)"}
              </option>
            </NativeSelect>
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Source name"
            help="e.g. CoinGecko ETH/USD daily close"
            error={e.sourceName?.message}
          >
            {(p) => <input {...register("sourceName")} {...p} className={inputClass} />}
          </Field>
          <Field label="Source link" help="Optional https link" error={e.sourceUrl?.message}>
            {(p) => (
              <input
                {...register("sourceUrl")}
                {...p}
                className={inputClass}
                placeholder="https://"
              />
            )}
          </Field>
        </div>
        <Field
          label="Resolution criteria"
          help="Exactly what counts: the data point, the time zone, rounding, and which outcome wins."
          error={e.criteria?.message}
        >
          {(p) => <textarea {...register("criteria")} {...p} rows={5} className={inputClass} />}
        </Field>
        <Field
          label="Edge cases"
          help="Optional: what happens if the source is down, the event is cancelled, or the data is revised."
          error={e.edgeCases?.message}
        >
          {(p) => <textarea {...register("edgeCases")} {...p} rows={3} className={inputClass} />}
        </Field>
      </div>
    );

  return (
    <div className="grid gap-5">
      <Field
        label="Initial liquidity (USDC)"
        help="You fund the market maker. Prices start equal across outcomes; your maximum loss is shown in the preview. What's left after resolution comes back to you."
        error={e.subsidy?.message}
      >
        {(p) => (
          <input
            {...register("subsidy")}
            {...p}
            className={`${inputClass} tabular`}
            inputMode="decimal"
          />
        )}
      </Field>
    </div>
  );
}

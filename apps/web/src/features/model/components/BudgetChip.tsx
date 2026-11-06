"use client";

import { Wallet } from "lucide-react";
import { useId } from "react";
import { modelCopy } from "@/content/model-copy";
import { cn } from "@/lib/cn";
import { useWalletUsdc } from "../hooks/use-wallet-usdc";
import { formatUsdcAsUsd, parseBudgetUsdc } from "../lib/money";
import { CHIP_CLASS } from "./chip-class";

type BudgetChipProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
};

/** How much of the connected wallet the engine may spend in this run. */
export function BudgetChip({ value, onChange }: BudgetChipProps) {
  const id = useId();
  const wallet = useWalletUsdc();
  const parsed = parseBudgetUsdc(value);
  const over = parsed !== null && wallet.status === "ready" && parsed > wallet.data;
  const problem =
    parsed === null ? modelCopy.budget.invalid : over ? modelCopy.budget.overWallet : null;
  const hint =
    problem ??
    (wallet.status === "ready" ? modelCopy.budget.wallet(formatUsdcAsUsd(wallet.data)) : null);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <label
        htmlFor={id}
        className={cn(
          CHIP_CLASS,
          "has-focus-visible:border-accent",
          problem !== null && "border-warning",
        )}
      >
        <Wallet aria-hidden strokeWidth={1.5} className="size-4 text-text-muted" />
        <span className="text-text-muted">{modelCopy.budget.label}</span>
        <span aria-hidden className="tabular text-text-faint">
          $
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={parsed === null}
          aria-describedby={hint === null ? undefined : `${id}-hint`}
          className="w-14 bg-transparent tabular text-text focus-visible:outline-none"
        />
      </label>
      {hint === null ? null : (
        <span
          id={`${id}-hint`}
          className={cn("text-small", problem === null ? "text-text-faint" : "text-warning")}
        >
          {hint}
        </span>
      )}
    </span>
  );
}

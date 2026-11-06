import { freed, grossCollateral, nettedCollateral, WAD } from "@kizashi/core";

/** The two-bucket cases of docs/formula/ACCOUNTING.md §3 that show a nonzero saving. */
export const NETTING_EXAMPLES = {
  short: [[-10n * WAD, 0n]],
  hedge: [
    [-10n * WAD, 0n],
    [6n * WAD, 0n],
  ],
  offset: [
    [-10n * WAD, 0n],
    [0n, -10n * WAD],
  ],
} as const satisfies Record<string, readonly (readonly bigint[])[]>;

export type NettingExampleId = keyof typeof NETTING_EXAMPLES;

export const NETTING_EXAMPLE_IDS = Object.keys(NETTING_EXAMPLES) as NettingExampleId[];

export type NettingSummary = {
  readonly grossWad: bigint;
  readonly nettedWad: bigint;
  readonly freedWad: bigint;
};

/** G, N and F through the same @kizashi/core helpers the portfolio meter uses. */
export function summarise(tickets: readonly (readonly bigint[])[]): NettingSummary {
  return {
    grossWad: grossCollateral(tickets),
    nettedWad: nettedCollateral(tickets),
    freedWad: freed(tickets),
  };
}

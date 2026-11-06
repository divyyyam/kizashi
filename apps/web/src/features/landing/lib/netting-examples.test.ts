import { describe, expect, test } from "bun:test";
import { WAD } from "@kizashi/core";
import { NETTING_EXAMPLES, summarise } from "./netting-examples";

// Expected G / N / F in whole USDC, from docs/formula/ACCOUNTING.md §3.
const EXPECTED = {
  short: [10n, 10n, 0n],
  hedge: [10n, 4n, 6n],
  offset: [20n, 10n, 10n],
} as const;

describe("landing netting examples match the accounting spec", () => {
  for (const [id, [gross, netted, freed]] of Object.entries(EXPECTED)) {
    test(id, () => {
      const summary = summarise(NETTING_EXAMPLES[id as keyof typeof EXPECTED]);
      expect(summary.grossWad).toBe(gross * WAD);
      expect(summary.nettedWad).toBe(netted * WAD);
      expect(summary.freedWad).toBe(freed * WAD);
    });
  }
});

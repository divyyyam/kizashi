import type { ProposalRef } from "@kizashi/schemas/engine";
import type { EffectStore } from "../../src/services/effects";

export function memoryEffects() {
  const results = new Map<string, unknown>();
  const store: EffectStore = {
    async claim(_runId, key) {
      if (results.has(key)) return { status: "existing", result: results.get(key) };
      results.set(key, null);
      return { status: "reserved" };
    },
    async complete(_runId, key, proposal: ProposalRef) {
      results.set(key, proposal);
    },
  };
  return { store, results };
}

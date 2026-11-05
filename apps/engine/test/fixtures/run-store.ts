import type { Principal } from "@kizashi/schemas/engine";
import type { RunStore } from "../../src/services/storage";

type StoredRun = Awaited<ReturnType<RunStore["create"]>>;

export function memoryRunStore(): RunStore {
  const runs = new Map<string, { run: StoredRun; chainId: number }>();
  return {
    async create(principal: Principal) {
      const run = {
        id: crypto.randomUUID(),
        owner: principal.sub,
        mode: "suggest",
        status: "created",
        createdAt: new Date(),
      };
      runs.set(run.id, { run, chainId: principal.chainId });
      return run;
    },
    async complete(runId) {
      const stored = runs.get(runId);
      if (!stored) throw new Error("Test run does not exist.");
      stored.run.status = "noop_completed";
      return stored.run;
    },
    async findOwned(runId, principal) {
      const stored = runs.get(runId);
      if (stored?.run.owner !== principal.sub || stored.chainId !== principal.chainId) return null;
      return stored.run;
    },
  };
}

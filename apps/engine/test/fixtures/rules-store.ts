import type { Principal } from "@kizashi/schemas/engine";
import { EngineServiceError } from "../../src/errors";
import type { RulesStore } from "../../src/services/rules-store";

type Stored = Awaited<ReturnType<RulesStore["create"]>>;

export function memoryRulesStore(): RulesStore {
  const runs = new Map<string, { run: Stored; chainId: number }>();
  const locks = new Set<string>();
  return {
    async create(principal: Principal, mode) {
      const run = {
        id: crypto.randomUUID(),
        owner: principal.sub,
        mode,
        status: "created",
        createdAt: new Date(),
      };
      runs.set(run.id, { run, chainId: principal.chainId });
      return run;
    },
    async findOwned(id, principal) {
      const stored = runs.get(id);
      if (stored?.run.owner !== principal.sub || stored.chainId !== principal.chainId) return null;
      return stored.run;
    },
    async withLock(id, action) {
      if (locks.has(id))
        throw new EngineServiceError(
          "no_pending_interrupt",
          "The run is already being updated.",
          409,
        );
      locks.add(id);
      try {
        return await action(async (options) => {
          const stored = runs.get(options.runId);
          if (!stored) throw new Error("Test run does not exist.");
          stored.run.status = options.confirmed ? "rules_confirmed" : "rules_pending";
        });
      } finally {
        locks.delete(id);
      }
    },
  };
}

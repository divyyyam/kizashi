import type { EngineDatabase } from "@kizashi/db";
import type { ProposalRef } from "@kizashi/schemas/engine";
import { EngineServiceError } from "../errors";
import { databaseOperation } from "./storage";

type EffectClaim = { status: "reserved" } | { status: "existing"; result: unknown };

export function createEffectStore(database: EngineDatabase) {
  return {
    async claim(runId: string, key: string): Promise<EffectClaim> {
      // The unique key makes reservation atomic even without the caller's run lock.
      const reserved = await databaseOperation(() =>
        database.effect.createMany({
          data: [{ key, runId, status: "reserved" }],
          skipDuplicates: true,
        }),
      );
      if (reserved.count === 1) return { status: "reserved" };
      const existing = await databaseOperation(() =>
        database.effect.findUnique({ where: { key } }),
      );
      if (!existing || existing.runId !== runId)
        throw new EngineServiceError("internal", "The proposal effect cannot be recovered.", 500);
      return { status: "existing", result: existing.result };
    },
    async complete(runId: string, key: string, result: ProposalRef) {
      const updated = await databaseOperation(() =>
        database.effect.updateMany({
          where: { key, runId, status: "reserved" },
          data: { status: "completed", result },
        }),
      );
      if (updated.count !== 1)
        throw new EngineServiceError("internal", "The proposal effect could not be stored.", 500);
    },
  };
}

export type EffectStore = ReturnType<typeof createEffectStore>;

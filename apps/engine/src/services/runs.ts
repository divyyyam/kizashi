import { type PreworkRun, type Principal, preworkRunSchema } from "@kizashi/schemas/engine";
import { EngineServiceError } from "../errors";
import type { createNoopGraph } from "../graph/build";
import type { RunStore } from "./storage";

const GRAPH_RECURSION_LIMIT = 25;
const MILLISECONDS_PER_SECOND = 1000;
type RunOptions = { store: RunStore; graph: ReturnType<typeof createNoopGraph> };

function runView(run: {
  id: string;
  owner: string;
  mode: string;
  status: string;
  createdAt: Date;
}): PreworkRun {
  return preworkRunSchema.parse({
    runId: run.id,
    user: run.owner,
    mode: run.mode,
    status: run.status,
    createdAtSec: Math.floor(run.createdAt.getTime() / MILLISECONDS_PER_SECOND),
  });
}

export function createRunService({ store, graph }: RunOptions) {
  return {
    // Internal smoke operation only: POST /runs retains its frozen rules-upload contract.
    async createNoop(principal: Principal) {
      const run = await store.create(principal);
      try {
        await graph.invoke(
          { runId: run.id, user: principal.sub, mode: "suggest", vault: null },
          {
            configurable: { thread_id: run.id },
            recursionLimit: GRAPH_RECURSION_LIMIT,
          },
        );
      } catch {
        throw new EngineServiceError(
          "internal",
          "The engine checkpoint is temporarily unavailable.",
          503,
        );
      }
      const completed = await store.complete(run.id);
      return runView(completed);
    },
    async read(runId: string, principal: Principal) {
      const run = await store.findOwned(runId, principal);
      if (!run) throw new EngineServiceError("not_found", "The run was not found.", 404);
      return { v: 1 as const, run: runView(run), pending: null };
    },
  };
}

export type RunService = ReturnType<typeof createRunService>;

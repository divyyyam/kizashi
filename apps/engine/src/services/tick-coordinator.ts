import {
  approvalNeededSchema,
  type Principal,
  ruleSetSchema,
  type TickContext,
  txNeededSchema,
} from "@kizashi/schemas/engine";
import { EngineServiceError } from "../errors";
import type { createCoreGraph } from "../graph/core-graph";
import { resetTick } from "../graph/nodes/core";
import type { EngineState } from "../graph/state";
import { rulesHash } from "./rules-hash";
import { expirePending } from "./tick-expiry";
import type { RunLock } from "./tick-lock";
import { createTickResume } from "./tick-resume";
import { ownedRun, streamTick, tickConfig } from "./tick-runtime";

export type TickPorts = {
  graph: ReturnType<typeof createCoreGraph>;
  lock: RunLock;
  findOwned: (
    id: string,
    principal: Principal,
  ) => Promise<{ mode: "suggest" | "auto"; stopped: boolean } | null>;
  beforeSignature: (state: EngineState) => Promise<void>;
  acceptTransaction: (state: EngineState, txHash: string) => Promise<void>;
  releaseReservation: (state: EngineState) => Promise<void>;
  onUpdate: (runId: string, update: unknown, tick: number) => Promise<void>;
  refreshContext: (state: EngineState, signal: AbortSignal) => Promise<TickContext>;
  nowSec: () => number;
};

export function createTickCoordinator(ports: TickPorts) {
  return {
    resume: createTickResume(ports),
    async pending(id: string, principal: Principal) {
      await ownedRun(ports, id, principal);
      const snapshot = await ports.graph.getState(tickConfig(id));
      const value: unknown = snapshot.tasks.flatMap((task) => task.interrupts ?? [])[0]?.value;
      if (snapshot.next.includes("suggestApproval")) return approvalNeededSchema.parse(value);
      if (snapshot.next.includes("awaitUserTx")) return txNeededSchema.parse(value);
      return null;
    },
    async tick(id: string, principal: Principal) {
      await ownedRun(ports, id, principal);
      return ports.lock(id, async () => {
        const run = await ownedRun(ports, id, principal);
        if (run.stopped)
          throw new EngineServiceError("no_pending_interrupt", "The run is stopped.", 409);
        const snapshot = await ports.graph.getState(tickConfig(id));
        if (snapshot.next.length > 0 && !(await expirePending(ports, id)))
          return { v: 1 as const, accepted: false };
        if (snapshot.values.rulesConfirmed !== true)
          throw new EngineServiceError(
            "rules_invalid",
            "Confirm the rules before starting a tick.",
            409,
          );
        await streamTick(ports, id, {
          ...resetTick(),
          runId: id,
          user: principal.sub,
          chainId: principal.chainId,
          mode: run.mode,
          rulesHash: rulesHash(ruleSetSchema.parse(snapshot.values.ruleSet)),
        });
        return { v: 1 as const, accepted: true };
      });
    },
  };
}

export type TickCoordinator = ReturnType<typeof createTickCoordinator>;

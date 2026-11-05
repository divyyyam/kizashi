import type { EngineDatabase } from "@kizashi/db";
import type { EngineMode, Principal } from "@kizashi/schemas/engine";
import { EngineServiceError } from "../errors";
import type { RunEvents } from "./run-events";
import { databaseOperation } from "./storage";

export function createRunControl(database: EngineDatabase, events?: Pick<RunEvents, "append">) {
  async function owned(
    id: string,
    principal: Principal,
  ): Promise<{ mode: EngineMode; stopped: boolean }> {
    const run = await databaseOperation(() =>
      database.run.findFirst({
        where: { id, owner: principal.sub, chainId: principal.chainId },
        select: { mode: true, killSwitch: { select: { stopped: true } } },
      }),
    );
    if (!run) throw new EngineServiceError("not_found", "The run was not found.", 404);
    if (run.mode !== "suggest" && run.mode !== "auto")
      throw new EngineServiceError("internal", "The run mode is invalid.", 503);
    return { mode: run.mode, stopped: run.killSwitch?.stopped ?? false };
  }
  return {
    owned,
    async mode(id: string, principal: Principal, mode: EngineMode) {
      await owned(id, principal);
      await databaseOperation(() => database.run.update({ where: { id }, data: { mode } }));
      return { v: 1 as const, mode };
    },
    async stop(id: string, principal: Principal) {
      await owned(id, principal);
      await databaseOperation(() =>
        database.killSwitch.upsert({
          where: { runId: id },
          create: { runId: id, stopped: true },
          update: { stopped: true },
        }),
      );
      await events?.append(id, { type: "run_stopped", data: { reason: "kill_switch" } });
      return { v: 1 as const, stopped: true as const };
    },
  };
}
export type RunControl = ReturnType<typeof createRunControl>;

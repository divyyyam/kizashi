import { engineSnapshotSchema, type Principal } from "@kizashi/schemas/engine";
import { EngineServiceError } from "../errors";
import type { TickPorts } from "./tick-coordinator";

export const tickConfig = (id: string) => ({ configurable: { thread_id: id }, recursionLimit: 25 });

export async function ownedRun(ports: TickPorts, id: string, principal: Principal) {
  const run = await ports.findOwned(id, principal);
  if (!run) throw new EngineServiceError("not_found", "The run was not found.", 404);
  return run;
}

export async function streamTick(
  ports: TickPorts,
  id: string,
  input: Parameters<TickPorts["graph"]["stream"]>[0],
) {
  const snapshot = await ports.graph.getState(tickConfig(id));
  const tick: number = typeof snapshot.values.tick === "number" ? snapshot.values.tick : 0;
  for await (const update of await ports.graph.stream(input, {
    ...tickConfig(id),
    streamMode: ["updates", "custom"],
  })) {
    await ports.onUpdate(id, update, tick);
  }
}

export async function pendingTick(ports: TickPorts, id: string) {
  const snapshot = await ports.graph.getState(tickConfig(id));
  if (!snapshot.next.some((node) => node === "suggestApproval" || node === "awaitUserTx")) {
    throw new EngineServiceError("no_pending_interrupt", "No matching approval is pending.", 409);
  }
  return { snapshot, state: engineSnapshotSchema.parse(snapshot.values) };
}

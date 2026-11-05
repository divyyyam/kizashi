import { engineSnapshotSchema } from "@kizashi/schemas/engine";
import { Command } from "@langchain/langgraph";
import type { TickPorts } from "./tick-coordinator";
import { streamTick, tickConfig } from "./tick-runtime";
import { tradeIdentity } from "./trade-identity";

// Interrupts stay pure; the coordinator expires a pending card on the next tick/resume.
export async function expirePending(ports: TickPorts, id: string) {
  const snapshot = await ports.graph.getState(tickConfig(id));
  const approval = snapshot.next.includes("suggestApproval");
  if (!approval && !snapshot.next.includes("awaitUserTx")) return false;
  const state = engineSnapshotSchema.parse(snapshot.values);
  if (!state.selected || !state.approvalExpiresAtSec || ports.nowSec() < state.approvalExpiresAtSec)
    return false;
  await ports.releaseReservation(state);
  const tradeId = tradeIdentity({
    runId: id,
    tick: state.tick,
    rulesHash: state.rulesHash,
    trade: state.selected,
    revision: state.selectionRevision,
  });
  const reply = approval
    ? { v: 1, kind: "approval", tradeId, decision: "reject" }
    : { v: 1, kind: "userTx", tradeId, cancelled: true };
  await streamTick(ports, id, new Command({ resume: reply }));
  return true;
}

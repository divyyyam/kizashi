import { approvalResumeSchema, type Principal, userTxResumeSchema } from "@kizashi/schemas/engine";
import { Command } from "@langchain/langgraph";
import { EngineServiceError } from "../errors";
import { callAdapter } from "./adapter-call";
import type { TickPorts } from "./tick-coordinator";
import { ownedRun, pendingTick, streamTick, tickConfig } from "./tick-runtime";
import { tradeIdentity } from "./trade-identity";

async function checkedReply(ports: TickPorts, id: string, input: unknown) {
  const { snapshot, state } = await pendingTick(ports, id);
  const parsed = snapshot.next.includes("suggestApproval")
    ? approvalResumeSchema.safeParse(input)
    : userTxResumeSchema.safeParse(input);
  if (!parsed.success)
    throw new EngineServiceError(
      "no_pending_interrupt",
      "This reply does not match the pending request.",
      409,
    );
  const reply = parsed.data;
  if (!state.selected)
    throw new EngineServiceError("no_pending_interrupt", "No matching approval is pending.", 409);
  const expected = tradeIdentity({
    runId: id,
    tick: state.tick,
    rulesHash: state.rulesHash,
    trade: state.selected,
    revision: state.selectionRevision,
  });
  if (reply.tradeId !== expected)
    throw new EngineServiceError("trade_id_mismatch", "This reply is for a different trade.", 409);
  if (!state.approvalExpiresAtSec || ports.nowSec() >= state.approvalExpiresAtSec) {
    await ports.releaseReservation(state);
    const cancelled =
      reply.kind === "approval"
        ? { v: 1, kind: "approval", tradeId: expected, decision: "reject" }
        : { v: 1, kind: "userTx", tradeId: expected, cancelled: true };
    await streamTick(ports, id, new Command({ resume: cancelled }));
    throw new EngineServiceError("no_pending_interrupt", "The trade approval has expired.", 409);
  }
  return { state, reply };
}

export function createTickResume(ports: TickPorts) {
  return async (id: string, principal: Principal, input: unknown) => {
    await ownedRun(ports, id, principal);
    return ports.lock(id, async () => {
      const run = await ownedRun(ports, id, principal);
      const { state, reply } = await checkedReply(ports, id, input);
      if (reply.kind === "approval" && reply.decision === "approve") {
        if (run.stopped)
          throw new EngineServiceError("no_pending_interrupt", "The run is stopped.", 409);
        await ports.beforeSignature(state);
      }
      if (reply.kind === "userTx" && "txHash" in reply)
        await ports.acceptTransaction(state, reply.txHash);
      if (
        (reply.kind === "approval" && reply.decision !== "approve") ||
        (reply.kind === "userTx" && "cancelled" in reply)
      )
        await ports.releaseReservation(state);
      if (reply.kind === "approval" && reply.decision === "edit") {
        if (run.stopped)
          throw new EngineServiceError("no_pending_interrupt", "The run is stopped.", 409);
        await ports.graph.updateState(tickConfig(id), {
          context: await callAdapter((signal) => ports.refreshContext(state, signal)),
        });
      }
      await streamTick(ports, id, new Command({ resume: reply }));
      return { v: 1 as const, accepted: true as const };
    });
  };
}

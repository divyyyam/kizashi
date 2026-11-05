import { approvalResumeSchema, userTxResumeSchema } from "@kizashi/schemas/engine";
import { interrupt } from "@langchain/langgraph";
import { EngineServiceError } from "../../errors";
import { tradeIdentity } from "../../services/trade-identity";
import type { EngineState } from "../state";
import type { EngineNode } from "./stubs";

function selection(state: EngineState) {
  const trade = state.selected;
  if (!trade || state.plan?.action !== "trade" || !state.rulesHash || !state.approvalExpiresAtSec) {
    throw new EngineServiceError("no_pending_interrupt", "No trade is awaiting approval.", 409);
  }
  const verdict = state.verdicts.find(
    (item) => item.candidateIndex === trade.candidateIndex && item.passed,
  );
  const candidate = state.plan.candidates[trade.candidateIndex];
  if (!candidate || !verdict)
    throw new EngineServiceError("plan_invalid", "The trade has not passed risk checks.", 409);
  return {
    trade,
    verdict,
    candidate,
    tradeId: tradeIdentity({
      runId: state.runId,
      tick: state.tick,
      rulesHash: state.rulesHash,
      trade,
      revision: state.selectionRevision,
    }),
  };
}

export const suggestApproval: EngineNode = async (state) => {
  const { trade, verdict, candidate, tradeId } = selection(state);
  const { call: _call, ...view } = trade;
  const reply = approvalResumeSchema.parse(
    interrupt({
      tick: state.tick,
      tradeId,
      trade: view,
      verdict,
      rationale: candidate.rationale,
      proposalKey: state.proposal?.key ?? null,
      expiresAtSec: state.approvalExpiresAtSec,
    }),
  );
  if (reply.tradeId !== tradeId)
    throw new EngineServiceError(
      "trade_id_mismatch",
      "The approval is for a different trade.",
      409,
    );
  const { v: _version, kind: _kind, ...approval } = reply;
  if (reply.decision === "edit") {
    return {
      approval,
      plan: {
        action: "trade",
        rationale: state.plan?.rationale ?? "",
        candidates: [{ ...candidate, shape: reply.shape, spendUsdc: reply.spendUsdc }],
      },
      compiled: [],
      verdicts: [],
      selected: null,
      pendingTx: null,
      proposal: null,
      approvalExpiresAtSec: null,
      revisions: 0,
    };
  }
  return { approval, outcome: reply.decision === "reject" ? "declined" : null };
};

export const awaitUserTx: EngineNode = async (state) => {
  const { trade, tradeId } = selection(state);
  const reply = userTxResumeSchema.parse(
    interrupt({
      tradeId,
      to: trade.call.to,
      data: trade.call.data,
      valueUsdc: "0",
      expiresAtSec: state.approvalExpiresAtSec,
    }),
  );
  if (reply.tradeId !== tradeId)
    throw new EngineServiceError(
      "trade_id_mismatch",
      "The transaction is for a different trade.",
      409,
    );
  return "cancelled" in reply
    ? { pendingTx: null, outcome: "declined" }
    : { pendingTx: { tradeId, txHash: reply.txHash, origin: "user" } };
};

import {
  type CompiledTrade,
  compiledTradeSchema,
  type SpendEntry,
  type TickContext,
  tickContextSchema,
} from "@kizashi/schemas/engine";
import { EngineServiceError } from "../errors";
import type { EngineState } from "../graph/state";
import { callAdapter } from "./adapter-call";
import { stopReason } from "./gate";
import { evaluateTrade } from "./risk";
import { rulesHash } from "./rules-hash";
import { tradeIdentity } from "./trade-identity";

type SignaturePorts = {
  loadContext: (state: EngineState, signal: AbortSignal) => Promise<TickContext>;
  refreshQuote: (
    state: EngineState,
    context: TickContext,
    signal: AbortSignal,
  ) => Promise<CompiledTrade>;
  reserve: (runId: string, entry: SpendEntry) => Promise<void>;
  nowSec: () => number;
};

function signatureIdentity(input: {
  state: EngineState;
  context: TickContext;
  trade: CompiledTrade;
}) {
  const { state, trade, context } = input;
  if (
    !state.selected ||
    !state.rulesConfirmed ||
    rulesHash(state.ruleSet) !== state.rulesHash ||
    state.plan?.action !== "trade"
  ) {
    throw new EngineServiceError(
      "rules_invalid",
      "The confirmed rules or selected trade have changed.",
      409,
    );
  }
  const identity = {
    runId: state.runId,
    tick: state.tick,
    rulesHash: state.rulesHash,
    revision: state.selectionRevision,
  };
  const expected = tradeIdentity({ ...identity, trade: state.selected });
  if (
    tradeIdentity({ ...identity, trade }) !== expected ||
    context.chainId !== state.chainId ||
    context.positionOwner.toLowerCase() !== (state.vault ?? state.user).toLowerCase()
  ) {
    throw new EngineServiceError("trade_id_mismatch", "The approved trade has changed.", 409);
  }
  return { expected, plan: state.plan };
}

function validateSignature(input: {
  state: EngineState;
  context: TickContext;
  trade: CompiledTrade;
}) {
  const { state, context, trade } = input;
  const { expected, plan } = signatureIdentity(input);
  const existing = context.spend.find((entry) => entry.tradeId === expected);
  if (existing && existing.status !== "reserved") {
    throw new EngineServiceError(
      "no_pending_interrupt",
      "This trade has already been submitted or closed.",
      409,
    );
  }
  const unreserved = {
    ...context,
    spend: context.spend.filter((entry) => entry.tradeId !== expected),
  };
  if (stopReason(unreserved, state.ruleSet)) {
    throw new EngineServiceError(
      "no_pending_interrupt",
      "The run can no longer submit this trade.",
      409,
    );
  }
  const candidate = plan.candidates[trade.candidateIndex];
  if (!candidate)
    throw new EngineServiceError("plan_invalid", "The selected candidate is unavailable.", 409);
  const verdict = evaluateTrade({ candidate, trade, context: unreserved, rules: state.ruleSet });
  if (!verdict.passed)
    throw new EngineServiceError(
      verdict.reasons[0] ?? "bad_request",
      "The trade no longer passes risk checks.",
      409,
    );
  return expected;
}

export function createSignatureGuard(ports: SignaturePorts) {
  return async (state: EngineState) => {
    const nowSec = ports.nowSec();
    if (!state.approvalExpiresAtSec || nowSec >= state.approvalExpiresAtSec) {
      throw new EngineServiceError("no_pending_interrupt", "The trade approval has expired.", 409);
    }
    const context = tickContextSchema.parse(
      await callAdapter((signal) => ports.loadContext(state, signal)),
    );
    const trade = compiledTradeSchema.parse(
      await callAdapter((signal) => ports.refreshQuote(state, context, signal)),
    );
    const checkedAtSec = ports.nowSec();
    if (checkedAtSec >= state.approvalExpiresAtSec)
      throw new EngineServiceError("no_pending_interrupt", "The trade approval has expired.", 409);
    const tradeId = validateSignature({
      state,
      context: { ...context, nowSec: checkedAtSec },
      trade,
    });
    await ports.reserve(state.runId, {
      tradeId,
      marketId: trade.marketId,
      spendUsdc: trade.limitUsdc,
      status: "reserved",
      atSec: checkedAtSec,
      expiresAtSec: state.approvalExpiresAtSec,
    });
  };
}

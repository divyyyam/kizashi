import {
  type CompiledTrade,
  compiledTradeSchema,
  type ProposalRef,
  proposalRefSchema,
  type TickContext,
  tickContextSchema,
} from "@kizashi/schemas/engine";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { EngineServiceError, UnavailableNodeError } from "../errors";
import { callAdapter } from "../services/adapter-call";
import type { EffectStore } from "../services/effects";
import { createEngineGraph } from "./build";
import { coreNodes, requireContext } from "./nodes/core";
import type { EngineNode } from "./nodes/stubs";
import { awaitUserTx, suggestApproval } from "./nodes/suggest";
import type { EngineState, EngineUpdate } from "./state";

const APPROVAL_SECONDS = 10 * 60;
const RECEIPT_TIMEOUT_MS = 60_000;
export type CoreAdapters = {
  loadContext: (state: EngineState, signal: AbortSignal) => Promise<TickContext>;
  compile: (state: EngineState, signal: AbortSignal) => Promise<CompiledTrade[]>;
  publishProposal?: (state: EngineState, signal: AbortSignal) => Promise<ProposalRef | null>;
  /** chargeUsdc is the verified on-chain charge; the runtime records it and strips it. */
  confirm?: (
    state: EngineState,
    signal: AbortSignal,
  ) => Promise<EngineUpdate & { chargeUsdc?: string }>;
};

function contextNode(adapters: CoreAdapters): EngineNode {
  return async (state) => {
    const context = tickContextSchema.parse(
      await callAdapter((signal) => adapters.loadContext(state, signal)),
    );
    if (
      context.positionOwner.toLowerCase() !== (state.vault ?? state.user).toLowerCase() ||
      context.chainId !== state.chainId
    ) {
      throw new EngineServiceError(
        "forbidden",
        "The market context belongs to a different account or chain.",
        409,
      );
    }
    if (
      state.ruleSet.allowedMarketIds.some(
        (id) => !context.markets.some((market) => market.marketId === id),
      )
    ) {
      throw new EngineServiceError(
        "unknown_market",
        "The allowed market context is incomplete.",
        503,
      );
    }
    return { context };
  };
}

const selectWithExpiry: EngineNode = async (state) => {
  const selected = await coreNodes.select(state);
  return {
    ...selected,
    selectionRevision: state.selectionRevision + 1,
    approvalExpiresAtSec: Math.min(
      requireContext(state).nowSec + APPROVAL_SECONDS,
      selected.selected?.deadlineSec ?? state.context.nowSec,
      state.ruleSet.stopAtSec,
    ),
  };
};

export function createProposalNode(adapters: CoreAdapters, effects?: EffectStore): EngineNode {
  return async (state) => {
    const publish = adapters.publishProposal;
    if (!publish || !effects) return arkivUnavailable(state);
    const key = `${state.runId}:${state.tick}:${state.selectionRevision}:proposal`;
    const effect = await effects.claim(state.runId, key);
    if (effect.status === "existing")
      return effect.result === null
        ? arkivUnavailable(state)
        : { proposal: parseProposal(effect.result) };
    let result: ProposalRef | null;
    try {
      result = await callAdapter((signal) => publish(state, signal), "arkiv_unavailable");
    } catch (error) {
      if (error instanceof EngineServiceError && error.code === "arkiv_unavailable")
        return arkivUnavailable(state);
      throw error;
    }
    if (result === null) return arkivUnavailable(state);
    const proposal = parseProposal(result);
    await effects.complete(state.runId, key, proposal);
    return { proposal };
  };
}

function parseProposal(input: unknown) {
  const result = proposalRefSchema.safeParse(input);
  if (!result.success)
    throw new EngineServiceError("internal", "The proposal reference is invalid.", 500);
  return result.data;
}

function arkivUnavailable(state: EngineState): EngineUpdate {
  const message = "The public proposal could not be safely published.";
  return {
    proposal: null,
    journal: [
      {
        node: "publishProposal",
        tick: state.tick,
        tSec: requireContext(state).nowSec,
        rulesHash: state.rulesHash,
        message,
        status: "skipped",
      },
    ],
    errors: [
      {
        code: "arkiv_unavailable",
        message,
        retryable: false,
        node: "publishProposal",
      },
    ],
  };
}

export function createCoreGraph(options: {
  checkpointer: BaseCheckpointSaver;
  model: BaseChatModel;
  adapters: CoreAdapters;
  effects?: EffectStore;
}) {
  const { adapters } = options;
  return createEngineGraph(options.checkpointer, {
    model: options.model,
    nodes: {
      ...coreNodes,
      suggestApproval,
      awaitUserTx,
      loadContext: contextNode(adapters),
      select: selectWithExpiry,
      compile: async (state) => ({
        compiled: (await callAdapter((signal) => adapters.compile(state, signal))).map((trade) =>
          compiledTradeSchema.parse(trade),
        ),
        selected: null,
        verdicts: [],
        approval: null,
        pendingTx: null,
      }),
      publishProposal: createProposalNode(adapters, options.effects),
      confirm: async (state) => {
        const confirm = adapters.confirm;
        if (!confirm) throw new UnavailableNodeError("confirm");
        return callAdapter(
          (signal) => confirm(state, signal),
          "tx_unconfirmed",
          RECEIPT_TIMEOUT_MS,
        );
      },
    },
  });
}

import type { EngineDatabase } from "@kizashi/db";
import type { CompiledTrade, TickContext } from "@kizashi/schemas/engine";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import type { Pool } from "pg";
import { EngineServiceError } from "../errors";
import { type CoreAdapters, createCoreGraph } from "../graph/core-graph";
import type { EngineState } from "../graph/state";
import { createEffectStore } from "./effects";
import { graphEvents } from "./graph-events";
import { createRunControl } from "./run-control";
import { createRunEvents } from "./run-events";
import { createSignatureGuard } from "./signature-guard";
import { createSpendStore } from "./spend-store";
import { createTickCoordinator } from "./tick-coordinator";
import { createRunLock } from "./tick-lock";
import { tradeIdentity } from "./trade-identity";

function reservationId(state: EngineState) {
  if (!state.selected)
    throw new EngineServiceError("no_pending_interrupt", "A selected trade is required.", 409);
  return tradeIdentity({
    runId: state.runId,
    tick: state.tick,
    rulesHash: state.rulesHash,
    trade: state.selected,
    revision: state.selectionRevision,
  });
}

export type TradingAdapters = CoreAdapters & {
  refreshQuote: (
    state: EngineState,
    context: TickContext,
    signal: AbortSignal,
  ) => Promise<CompiledTrade>;
};

export function createTradingRuntime(options: {
  database: EngineDatabase;
  pool: Pool;
  checkpointer: BaseCheckpointSaver;
  model: BaseChatModel;
  adapters: TradingAdapters;
}) {
  const { database, pool, model, checkpointer, adapters } = options;
  const events = createRunEvents(database),
    control = createRunControl(database, events),
    spend = createSpendStore(database);
  const nowSec = () => Math.floor(Date.now() / 1000);
  const loadContext = async (state: EngineState, signal: AbortSignal) => ({
    ...(await adapters.loadContext(state, signal)),
    nowSec: nowSec(),
    spend: await spend.read(state.runId),
    killSwitch:
      (await database.killSwitch.findUnique({ where: { runId: state.runId } }))?.stopped ?? false,
  });
  const confirm = adapters.confirm;
  const settle = confirm
    ? async (state: EngineState, signal: AbortSignal) => {
        const { chargeUsdc, ...update } = await confirm(state, signal);
        const id = reservationId(state);
        const entry = (await spend.read(state.runId)).find((item) => item.tradeId === id);
        if (entry?.status === "sent") await spend.transition(state.runId, entry, "confirmed");
        await database.execution.updateMany({
          where: { tradeId: id, runId: state.runId },
          data: { status: "confirmed", chargeUsdc: chargeUsdc ?? null },
        });
        return update;
      }
    : undefined;
  const graph = createCoreGraph({
    model,
    checkpointer,
    adapters: { ...adapters, loadContext, ...(settle ? { confirm: settle } : {}) },
    effects: createEffectStore(database),
  });
  const ticks = createTickCoordinator({
    graph,
    lock: createRunLock(pool),
    findOwned: control.owned,
    nowSec,
    refreshContext: loadContext,
    beforeSignature: createSignatureGuard({
      loadContext,
      refreshQuote: adapters.refreshQuote,
      reserve: spend.reserve,
      nowSec,
    }),
    acceptTransaction: async (state, txHash) => {
      const tradeId = reservationId(state);
      await spend.submitted({ runId: state.runId, tradeId, txHash });
    },
    releaseReservation: async (state) => {
      if (!state.selected) return;
      const id = reservationId(state);
      const entry = (await spend.read(state.runId)).find((entry) => entry.tradeId === id);
      if (entry?.status === "reserved")
        await spend.transition(
          state.runId,
          entry,
          entry.expiresAtSec <= nowSec() ? "expired" : "cancelled",
        );
    },
    onUpdate: async (runId, update, tick) => {
      for (const event of graphEvents(update, tick)) await events.append(runId, event);
    },
  });
  return { graph, ticks, spend };
}

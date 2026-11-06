import type { Hash } from "viem";
import { EngineServiceError } from "../../errors";
import type { EngineState, EngineUpdate } from "../../graph/state";
import type { ProposalPublisher } from "../arkiv-proposals";
import type { TradingAdapters } from "../trading-runtime";
import { createCompiler, createQuoteRefresher } from "./compile";
import { confirmOnArc } from "./confirm";
import { type ArcReader, createContextLoader } from "./context";

/** Suggest-mode adapters: Arc is read for every money decision; Arkiv only mirrors proposals. */
export function createArcAdapters(arc: ArcReader, publisher?: ProposalPublisher): TradingAdapters {
  return {
    loadContext: createContextLoader(arc),
    compile: createCompiler(arc),
    refreshQuote: createQuoteRefresher(arc),
    ...(publisher ? { publishProposal: publisher.publish } : {}),
    confirm: async (state: EngineState): Promise<EngineUpdate & { chargeUsdc: string }> => {
      const trade = state.selected;
      const pending = state.pendingTx;
      if (!trade || !pending)
        throw new EngineServiceError("no_pending_interrupt", "No transaction to confirm.", 409);
      const verified = await confirmOnArc(arc.client, pending.txHash as Hash, trade);
      const approvedTx =
        state.proposal && publisher
          ? await publisher.approve(state.proposal.key, verified.txHash)
          : null;
      return {
        chargeUsdc: verified.chargeUsdc,
        outcome: "traded",
        journal: [
          {
            node: "confirm",
            tick: state.tick,
            tSec: Math.floor(Date.now() / 1000),
            rulesHash: state.rulesHash,
            status: "done",
            message: `traded: ${verified.txHash} in block ${verified.blockNumber}, charged ${verified.chargeUsdc} USDC base units${approvedTx ? `; Arkiv proposal approved in ${approvedTx}` : ""}`,
          },
        ],
      };
    },
  };
}

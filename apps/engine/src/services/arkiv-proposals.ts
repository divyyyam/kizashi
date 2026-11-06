import {
  type ArkivEnv,
  arkivConfigFromEnv,
  createArkivWriter,
  markProposalApproved,
  publishProposal,
} from "@kizashi/arkiv";
import type { ProposalRef } from "@kizashi/schemas/engine";
import type { Logger } from "pino";
import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { EngineServiceError } from "../errors";
import type { EngineState } from "../graph/state";

const PROPOSAL_SECONDS = 10 * 60;

/** One signer per process: every Arkiv write goes through this queue so nonces never race. */
function serialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>) => {
    const next = tail.then(task, task);
    tail = next.catch(() => undefined);
    return next;
  };
}

export type ProposalPublisher = {
  writer: string;
  publish: (state: EngineState, signal: AbortSignal) => Promise<ProposalRef | null>;
  approve: (entityKey: string, txHash: string) => Promise<string | null>;
};

export type ArkivStatus =
  | { status: "ready"; writer: string }
  | { status: "unavailable"; reason: string };

export function createProposalPublisher(
  env: ArkivEnv & { ENGINE_ARKIV_PRIVATE_KEY?: string | undefined },
  logger: Logger,
): { status: ArkivStatus; publisher?: ProposalPublisher } {
  const config = arkivConfigFromEnv(env);
  if (config.status !== "ready") return { status: config };
  const key = env.ENGINE_ARKIV_PRIVATE_KEY?.trim();
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key))
    return { status: { status: "unavailable", reason: "ENGINE_ARKIV_PRIVATE_KEY is not set" } };
  const account = privateKeyToAccount(key as Hex);
  const writer = createArkivWriter({ ...config.config, account });
  const enqueue = serialQueue();
  const publisher: ProposalPublisher = {
    writer: account.address,
    publish: async (state) => {
      const trade = state.selected;
      const verdict = state.verdicts.find((v) => v.candidateIndex === trade?.candidateIndex);
      const candidate =
        state.plan?.action === "trade" && trade
          ? state.plan.candidates[trade.candidateIndex]
          : null;
      if (!trade || !verdict || !candidate || !state.rulesHash)
        throw new EngineServiceError("no_pending_interrupt", "No selected trade to publish.", 409);
      const expiresAtSec = Math.floor(Date.now() / 1000) + PROPOSAL_SECONDS;
      try {
        const result = await enqueue(() =>
          publishProposal(writer, {
            marketId: trade.marketId,
            arcChainId: trade.chainId,
            user: trade.positionOwner,
            runId: state.runId,
            rulesHash: state.rulesHash as string,
            payload: {
              deltaWad: trade.payoutWad,
              limitUsdc: trade.limitUsdc,
              deadlineSec: trade.deadlineSec,
              sizeUsdc: candidate.spendUsdc,
              risk: { ok: verdict.passed, reasons: verdict.reasons },
              reason: candidate.rationale.slice(0, 280),
            },
          }),
        );
        logger.info(
          { runId: state.runId, entityKey: result.entityKey, arkivTx: result.txHash },
          "Arkiv proposal published",
        );
        return { key: result.entityKey, expiresAtSec };
      } catch (error) {
        logger.warn(
          { runId: state.runId, code: "arkiv_unavailable", reason: errorName(error) },
          "Arkiv proposal write failed",
        );
        throw new EngineServiceError("arkiv_unavailable", "The Arkiv write failed.", 503);
      }
    },
    approve: async (entityKey, txHash) => {
      try {
        const result = await enqueue(() => markProposalApproved(writer, entityKey as Hex, txHash));
        logger.info(
          { entityKey, arkivTx: result.txHash, arcTx: txHash },
          "Arkiv proposal approved",
        );
        return result.txHash;
      } catch (error) {
        logger.warn(
          { entityKey, code: "arkiv_unavailable", reason: errorName(error) },
          "Arkiv approval patch failed",
        );
        return null;
      }
    },
  };
  return { status: { status: "ready", writer: account.address }, publisher };
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "unknown";
}

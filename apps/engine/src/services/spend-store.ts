import type { EngineDatabase } from "@kizashi/db";
import { type SpendEntry, spendEntrySchema } from "@kizashi/schemas/engine";
import { EngineServiceError } from "../errors";
import { databaseOperation } from "./storage";

const prefix = "spend:";

// All writes run under the coordinator's session lock for this runId.
export function createSpendStore(database: EngineDatabase) {
  return {
    async read(runId: string) {
      const effects = await databaseOperation(() =>
        database.effect.findMany({
          where: { runId, key: { startsWith: prefix } },
          select: { result: true },
        }),
      );
      return effects.map((effect) => spendEntrySchema.parse(effect.result));
    },
    async reserve(runId: string, input: SpendEntry) {
      const entry = spendEntrySchema.parse(input);
      const stored = await databaseOperation(() =>
        database.effect.upsert({
          where: { key: `${prefix}${entry.tradeId}` },
          update: {},
          create: { key: `${prefix}${entry.tradeId}`, runId, status: "reserved", result: entry },
        }),
      );
      const previous = spendEntrySchema.parse(stored.result);
      if (
        stored.runId !== runId ||
        stored.status !== "reserved" ||
        previous.marketId !== entry.marketId ||
        previous.spendUsdc !== entry.spendUsdc ||
        previous.expiresAtSec !== entry.expiresAtSec
      ) {
        throw new EngineServiceError(
          "trade_id_mismatch",
          "This trade reservation is already closed or has changed.",
          409,
        );
      }
    },
    async transition(runId: string, entry: SpendEntry, next: SpendEntry["status"]) {
      if (!validTransition(entry.status, next)) {
        throw new EngineServiceError(
          "bad_request",
          "This spend reservation cannot change to that state.",
          409,
        );
      }
      const updated = await databaseOperation(() =>
        database.effect.updateMany({
          where: { key: `${prefix}${entry.tradeId}`, runId, status: entry.status },
          data: { status: next, result: { ...entry, status: next } },
        }),
      );
      if (updated.count !== 1)
        throw new EngineServiceError(
          "no_pending_interrupt",
          "The spend reservation has already changed.",
          409,
        );
    },
    submitted: (input: { runId: string; tradeId: string; txHash: string }) =>
      markSubmitted(database, input),
  };
}

async function markSubmitted(
  database: EngineDatabase,
  input: { runId: string; tradeId: string; txHash: string },
) {
  return databaseOperation(() =>
    database.$transaction(async (transaction) => {
      const effect = await transaction.effect.findUnique({
        where: { key: `${prefix}${input.tradeId}` },
      });
      if (
        !effect ||
        effect.runId !== input.runId ||
        !["reserved", "sent"].includes(effect.status)
      ) {
        throw new EngineServiceError(
          "no_pending_interrupt",
          "No active spend reservation matches this trade.",
          409,
        );
      }
      const existing = await transaction.execution.findUnique({
        where: { tradeId: input.tradeId },
      });
      if (existing && (existing.runId !== input.runId || existing.txHash !== input.txHash)) {
        throw new EngineServiceError(
          "tx_mismatch",
          "A different transaction is already recorded for this trade.",
          409,
        );
      }
      const entry = spendEntrySchema.parse(effect.result);
      await transaction.execution.upsert({
        where: { tradeId: input.tradeId },
        update: {},
        create: {
          tradeId: input.tradeId,
          runId: input.runId,
          txHash: input.txHash,
          origin: "user",
          status: "unconfirmed",
        },
      });
      await transaction.effect.update({
        where: { key: effect.key },
        data: { status: "sent", result: { ...entry, status: "sent" } },
      });
    }),
  );
}

export function validTransition(previous: SpendEntry["status"], next: SpendEntry["status"]) {
  if (previous === "reserved") return ["sent", "cancelled", "expired"].includes(next);
  if (previous === "sent") return ["confirmed", "failed"].includes(next);
  return false;
}

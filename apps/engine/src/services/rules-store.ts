import type { EngineDatabase } from "@kizashi/db";
import type { EngineMode, Principal, RuleSet } from "@kizashi/schemas/engine";
import { EngineServiceError } from "../errors";
import { databaseOperation } from "./storage";

const LOCK_TIMEOUT_MS = 10_000;
const selection = { id: true, owner: true, mode: true, status: true, createdAt: true } as const;
export type RuleSync = {
  runId: string;
  hash: string;
  rules: RuleSet;
  source: "json" | "pdf";
  confirmed: boolean;
};
export type PersistRules = (options: RuleSync) => Promise<void>;

export function createRulesStore(database: EngineDatabase) {
  return {
    async create(principal: Principal, mode: EngineMode) {
      return databaseOperation(() =>
        database.run.create({
          data: { owner: principal.sub, chainId: principal.chainId, mode },
          select: selection,
        }),
      );
    },
    async findOwned(id: string, principal: Principal) {
      return databaseOperation(() =>
        database.run.findFirst({
          where: { id, owner: principal.sub, chainId: principal.chainId },
          select: selection,
        }),
      );
    },
    async withLock<T>(runId: string, action: (persist: PersistRules) => Promise<T>): Promise<T> {
      try {
        return await database.$transaction(
          async (transaction) => {
            const rows = await transaction.$queryRaw<{ locked: boolean }[]>`
            SELECT pg_try_advisory_xact_lock(hashtextextended(${runId}, 0)) AS locked
          `;
            if (!rows[0]?.locked) {
              throw new EngineServiceError(
                "no_pending_interrupt",
                "The run is already being updated.",
                409,
              );
            }
            const persist: PersistRules = async ({ hash, rules, source, confirmed }) => {
              await transaction.ruleSet.upsert({
                where: { runId_hash: { runId, hash } },
                create: {
                  runId,
                  hash,
                  parsed: rules,
                  source,
                  confirmedAt: confirmed ? new Date() : null,
                },
                update: confirmed ? { confirmedAt: new Date() } : {},
              });
              await transaction.run.update({
                where: { id: runId },
                data: {
                  status: confirmed ? "rules_confirmed" : "rules_pending",
                  rulesConfirmed: confirmed,
                },
              });
            };
            return action(persist);
          },
          { timeout: LOCK_TIMEOUT_MS, maxWait: LOCK_TIMEOUT_MS },
        );
      } catch (error) {
        if (error instanceof EngineServiceError) throw error;
        throw new EngineServiceError("internal", "Engine storage is temporarily unavailable.", 503);
      }
    },
  };
}

export type RulesStore = ReturnType<typeof createRulesStore>;

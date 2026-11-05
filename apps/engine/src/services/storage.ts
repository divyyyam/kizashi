import type { EngineDatabase } from "@kizashi/db";
import type { Principal } from "@kizashi/schemas/engine";
import { EngineServiceError } from "../errors";

export async function databaseOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof EngineServiceError) throw error;
    // Database diagnostics may contain credentials; keep the process boundary sanitized.
    throw new EngineServiceError("internal", "Engine storage is temporarily unavailable.", 503);
  }
}

export function createNonceStore(database: EngineDatabase) {
  return {
    async create(nonce: string, expiresAt: Date) {
      await databaseOperation(() => database.authNonce.create({ data: { nonce, expiresAt } }));
    },
    async find(nonce: string) {
      return databaseOperation(() => database.authNonce.findUnique({ where: { nonce } }));
    },
    async consume(nonce: string, now: Date) {
      const result = await databaseOperation(() =>
        database.authNonce.deleteMany({
          where: { nonce, expiresAt: { gt: now } },
        }),
      );
      return result.count === 1;
    },
  };
}

export type NonceStore = ReturnType<typeof createNonceStore>;

const runSelection = { id: true, owner: true, mode: true, status: true, createdAt: true } as const;

export function createRunStore(database: EngineDatabase) {
  return {
    async create(principal: Principal) {
      return databaseOperation(() =>
        database.run.create({
          data: { owner: principal.sub, chainId: principal.chainId, mode: "suggest" },
          select: runSelection,
        }),
      );
    },
    async complete(runId: string) {
      return databaseOperation(() =>
        database.run.update({
          where: { id: runId },
          data: { status: "noop_completed" },
          select: runSelection,
        }),
      );
    },
    async findOwned(runId: string, principal: Principal) {
      return databaseOperation(() =>
        database.run.findFirst({
          where: { id: runId, owner: principal.sub, chainId: principal.chainId },
          select: runSelection,
        }),
      );
    },
  };
}

export type RunStore = ReturnType<typeof createRunStore>;

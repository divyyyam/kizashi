import type { Pool } from "pg";
import { EngineServiceError } from "../errors";
import { databaseOperation } from "./storage";

export type RunLock = <T>(runId: string, action: () => Promise<T>) => Promise<T>;

export function createRunLock(pool: Pool): RunLock {
  return async (runId, action) => {
    const client = await databaseOperation(() => pool.connect());
    let locked = false;
    let broken = false;
    try {
      const result = await databaseOperation(() =>
        client.query<{ locked: boolean }>(
          "SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked",
          [runId],
        ),
      );
      locked = result.rows[0]?.locked === true;
      if (!locked)
        throw new EngineServiceError(
          "no_pending_interrupt",
          "The run is already being updated.",
          409,
        );
      // The dedicated session holds the lock without an open transaction during LLM/RPC work.
      return await action();
    } catch (error) {
      // A timed-out lock query may still have acquired the lock on the server.
      broken = true;
      throw error;
    } finally {
      if (locked) {
        try {
          await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [runId]);
        } catch {
          broken = true;
        }
      }
      client.release(broken);
    }
  };
}

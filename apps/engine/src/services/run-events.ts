import type { EngineDatabase } from "@kizashi/db";
import {
  type RunEventPayload,
  runEventPayloadSchema,
  runEventSchema,
} from "@kizashi/schemas/engine";
import { databaseOperation } from "./storage";

const EVENT_HISTORY_LIMIT = 500;

export function createRunEvents(database: EngineDatabase) {
  return {
    async append(runId: string, input: RunEventPayload) {
      const payload = runEventPayloadSchema.parse(input);
      return databaseOperation(() =>
        database.$transaction(async (transaction) => {
          // A separate lock namespace avoids contending with the long-lived tick session lock.
          await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${runId}, 1))::text`;
          const latest = await transaction.runEvent.findFirst({
            where: { runId },
            orderBy: { seq: "desc" },
          });
          const seq = (latest?.seq ?? 0) + 1;
          const tSec = Math.floor(Date.now() / 1000);
          await transaction.runEvent.create({
            data: { runId, seq, type: payload.type, payload: payload.data, tSec },
          });
          await transaction.runEvent.deleteMany({
            where: { runId, seq: { lte: seq - EVENT_HISTORY_LIMIT } },
          });
          return runEventSchema.parse({ v: 1, runId, seq, tSec, ...payload });
        }),
      );
    },
    async since(runId: string, after: number) {
      // One snapshot prevents retention racing a separate oldest-event query.
      const retained = await databaseOperation(() =>
        database.runEvent.findMany({
          where: { runId },
          orderBy: { seq: "desc" },
          take: EVENT_HISTORY_LIMIT,
        }),
      );
      const events = retained.reverse();
      return {
        gap: events[0] !== undefined && after < events[0].seq - 1,
        events: events
          .filter((event) => event.seq > after)
          .map((event) =>
            runEventSchema.parse({
              v: 1,
              runId,
              seq: event.seq,
              tSec: Number(event.tSec),
              type: event.type,
              data: event.payload,
            }),
          ),
      };
    },
  };
}

export type RunEvents = ReturnType<typeof createRunEvents>;

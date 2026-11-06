import { modelCopy } from "@/content/model-copy";
import type { EngineRunAdapter } from "../types";

/**
 * The engine API streams graph events (`GET /runs/:id/stream`, SSE) but not yet the crowd and
 * engine curves this page draws, so a live run reports that honestly instead of guessing.
 * Replace `start` with the stream subscription once the stream carries those fields.
 */
export const liveRunAdapter: EngineRunAdapter = {
  start(_request, emit) {
    const timer = setTimeout(
      () => emit({ type: "unavailable", reason: modelCopy.unavailable.title }),
      0,
    );
    return () => clearTimeout(timer);
  },
};

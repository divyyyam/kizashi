"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { IDLE_RUN, runReducer, type Settlement } from "../lib/run-reducer";
import type { EngineRunAdapter, RunRequest } from "../types";

/** Drives one engine run at a time through `adapter`, cancelling the previous one on restart. */
export function useEngineRun(adapter: EngineRunAdapter) {
  const [state, dispatch] = useReducer(runReducer, IDLE_RUN);
  const cancel = useRef<(() => void) | null>(null);

  const start = useCallback(
    (request: RunRequest) => {
      cancel.current?.();
      dispatch({ type: "start", request });
      cancel.current = adapter.start(request, (event) => dispatch({ type: "event", event }));
    },
    [adapter],
  );
  const reset = useCallback(() => {
    cancel.current?.();
    cancel.current = null;
    dispatch({ type: "reset" });
  }, []);
  const settle = useCallback(
    (settlement: Settlement) => dispatch({ type: "settle", settlement }),
    [],
  );

  useEffect(() => () => cancel.current?.(), []);
  return { state, start, reset, settle };
}

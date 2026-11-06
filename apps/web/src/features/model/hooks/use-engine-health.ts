"use client";

import { healthResponseSchema } from "@kizashi/schemas/engine";
import { useEffect, useState } from "react";
import { env } from "@/lib/env";
import { ENGINE_URL } from "../lib/engine-http";

export function useEngineHealth() {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"checking" | "connected" | "offline" | "unconfigured">(
    ENGINE_URL ? "checking" : "unconfigured",
  );
  useEffect(() => {
    if (!ENGINE_URL || attempt < 0) return;
    const controller = new AbortController();
    setStatus("checking");
    fetch(`${ENGINE_URL}/health`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
      cache: "no-store",
    })
      .then(async (response) => {
        const health = healthResponseSchema.parse(await response.json());
        if (!controller.signal.aborted)
          setStatus(
            response.ok && health.ok && health.chainId === env.NEXT_PUBLIC_CHAIN_ID
              ? "connected"
              : "offline",
          );
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("offline");
      });
    return () => controller.abort();
  }, [attempt]);
  return { status, retry: () => setAttempt((value) => value + 1) };
}

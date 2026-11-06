"use client";

import { useEffect, useState } from "react";
import { type Connector, useConnectors } from "wagmi";

/** An EIP-6963 announcement and the legacy injected connector can point to the same extension. */
export function useBrowserWallets() {
  const connectors = useConnectors();
  const [wallets, setWallets] = useState<readonly Connector[]>();
  useEffect(() => {
    let active = true;
    const injected = connectors.filter((connector) => connector.type === "injected");
    const discover = async () => {
      const found = await Promise.allSettled(injected.map((connector) => connector.getProvider()));
      const providers = new Set<unknown>();
      // Prefer the announced wallet's name and emblem over the catch-all "Injected".
      const ranked = injected
        .map((connector, i) => ({ connector, result: found[i] }))
        .sort(
          (a, b) => Number(a.connector.id === "injected") - Number(b.connector.id === "injected"),
        );
      const available: Connector[] = [];
      for (const { connector, result } of ranked) {
        if (result?.status !== "fulfilled" || !result.value || providers.has(result.value))
          continue;
        providers.add(result.value);
        available.push(connector);
      }
      if (active) setWallets(available);
    };
    void discover();
    return () => {
      active = false;
    };
  }, [connectors]);
  return wallets;
}

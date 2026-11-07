"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { Address, PublicClient, WalletClient } from "viem";
import { copy } from "@/content/copy";
import { appChain } from "@/lib/wagmi";
import { publishListing } from "../lib/create-requests";
import type { CreateProgress } from "../lib/creation-progress";
import { performCreation } from "../lib/perform-creation";
import type { CreateFormValues } from "../types";

type Options = {
  client: PublicClient | undefined;
  wallet: WalletClient | undefined;
  owner: Address | undefined;
  walletChain: number | undefined;
};

export function useCreationActions({ client, wallet, owner, walletChain }: Options) {
  const queries = useQueryClient();
  const [progress, setProgress] = useState<CreateProgress>({ phase: "idle" });
  const [isRetrying, setRetrying] = useState(false);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!owner || walletChain !== appChain.id) controller.current?.abort();
    return () => controller.current?.abort();
  }, [owner, walletChain]);

  async function create(values: CreateFormValues) {
    if (
      busy.current ||
      !client ||
      !wallet ||
      !owner ||
      walletChain !== appChain.id ||
      progress.phase === "done" ||
      (progress.phase === "failed" && progress.creationSubmitted)
    )
      return;
    busy.current = true;
    controller.current = new AbortController();
    try {
      const result = await performCreation(
        { client, wallet, owner, signal: controller.current.signal, report: setProgress },
        values,
      );
      setProgress(result);
      if (result.phase === "done") await queries.invalidateQueries();
    } finally {
      busy.current = false;
    }
  }
  async function retryListing() {
    if (busy.current || progress.phase !== "done") return;
    busy.current = true;
    setRetrying(true);
    controller.current = new AbortController();
    try {
      const entityKey = await publishListing(
        progress.marketId,
        progress.rulesJson,
        controller.current.signal,
      );
      setProgress({ ...progress, listing: { entityKey } });
    } catch {
      setProgress({ ...progress, listing: { error: copy.feedback.create.listingError } });
    } finally {
      busy.current = false;
      setRetrying(false);
    }
  }
  return { progress, isRetrying, create, retryListing };
}

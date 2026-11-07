"use client";

import { factoryAddress, usdcAddressByChainId } from "@kizashi/contracts";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { copy } from "@/content/copy";
import { appChain } from "@/lib/wagmi";
import type { CreateMarket } from "../lib/creation-progress";
import { useCreationActions } from "./use-creation-actions";

export type { CreateMarket, CreateProgress, CreateStep } from "../lib/creation-progress";

export function useCreateMarket(): CreateMarket {
  const { address, chainId: walletChain } = useAccount();
  const client = usePublicClient({ chainId: appChain.id });
  const { data: wallet } = useWalletClient({ chainId: appChain.id });
  const action = useCreationActions({ client, wallet, owner: address, walletChain });
  const reason =
    !factoryAddress(appChain.id) || !usdcAddressByChainId(appChain.id)
      ? copy.feedback.create.unavailable
      : !address
        ? copy.feedback.create.connect
        : walletChain !== appChain.id
          ? copy.feedback.create.network(appChain.name)
          : !client || !wallet
            ? copy.feedback.create.waiting
            : action.progress.phase === "running"
              ? copy.feedback.create.pending
              : action.progress.phase === "failed" && action.progress.creationSubmitted
                ? copy.feedback.create.partial
                : undefined;
  return { ...action, ready: reason === undefined, ...(reason ? { reason } : {}) };
}

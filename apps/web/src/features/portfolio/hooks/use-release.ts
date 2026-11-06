"use client";

import { kizashiPoolAbi } from "@kizashi/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { Address } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { copy } from "@/content/copy";
import { txUrl } from "@/lib/explorer";

export function useRelease(poolAddress?: Address, chainId?: number) {
  const publicClient = usePublicClient({ chainId });
  const { data: walletClient } = useWalletClient({ chainId });
  const queryClient = useQueryClient();
  const [isReleasing, setIsReleasing] = useState(false);

  const release = async (amountWad: bigint) => {
    if (!poolAddress || !publicClient || !walletClient) return;
    setIsReleasing(true);
    try {
      const { request } = await publicClient.simulateContract({
        address: poolAddress,
        abi: kizashiPoolAbi,
        functionName: "release",
        args: [amountWad],
        account: walletClient.account,
      });
      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "success") {
        toast(copy.portfolio.releaseSuccess, {
          action: chainId
            ? {
                label: copy.tx.viewOnExplorer,
                onClick: () => {
                  const url = txUrl(chainId, hash);
                  if (url) window.open(url, "_blank");
                },
              }
            : undefined,
        });
        await queryClient.invalidateQueries();
      } else {
        toast(copy.tx.failed);
      }
    } catch {
      toast(copy.tx.failed);
    } finally {
      setIsReleasing(false);
    }
  };

  return { release, isReleasing };
}

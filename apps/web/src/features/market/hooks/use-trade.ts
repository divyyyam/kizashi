"use client";

import { erc20Abi, kizashiPoolAbi, usdcAddressByChainId } from "@kizashi/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { Address } from "viem";
import { maxUint256 } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { copy } from "@/content/copy";
import { txUrl } from "@/lib/explorer";

export type TradeAction =
  | { status: "not_ready"; reason: string }
  | {
      status: "ready";
      needsApproval: boolean;
      isApproving: boolean;
      isTrading: boolean;
      approve: () => Promise<void>;
      trade: (delta: readonly bigint[], limitUsdc: bigint, deadline?: bigint) => Promise<void>;
      reason?: undefined;
    };

export function useTrade(identity: {
  chainId: number;
  poolAddress?: Address | undefined;
  owner?: Address | undefined;
  chargeUsdc?: bigint | undefined;
}): TradeAction {
  const { chainId, poolAddress, owner, chargeUsdc } = identity;
  const publicClient = usePublicClient({ chainId });
  const { data: walletClient } = useWalletClient({ chainId });
  const queryClient = useQueryClient();

  const [isApproving, setIsApproving] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  const [allowance, setAllowance] = useState<bigint | undefined>();

  const usdc = usdcAddressByChainId(chainId);

  // Check allowance when poolAddress and owner are known
  if (publicClient && usdc && poolAddress && owner && allowance === undefined) {
    publicClient
      .readContract({
        address: usdc,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, poolAddress],
      })
      .then((val) => setAllowance(val))
      .catch(() => {});
  }

  if (!poolAddress) {
    return { status: "not_ready", reason: copy.market.tradingNotLive };
  }
  if (!owner) {
    return { status: "not_ready", reason: copy.market.connect };
  }
  if (!walletClient || !publicClient) {
    return { status: "not_ready", reason: copy.errors.network };
  }

  const needsApproval =
    chargeUsdc !== undefined &&
    chargeUsdc > 0n &&
    (allowance === undefined || allowance < chargeUsdc);

  const approve = async () => {
    if (!usdc || !poolAddress) return;
    setIsApproving(true);
    try {
      const { request } = await publicClient.simulateContract({
        address: usdc,
        abi: erc20Abi,
        functionName: "approve",
        args: [poolAddress, maxUint256],
        account: owner,
      });
      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      setAllowance(maxUint256);
      toast(copy.tx.success);
    } catch {
      toast(copy.tx.failed);
    } finally {
      setIsApproving(false);
    }
  };

  const trade = async (delta: readonly bigint[], limitUsdc: bigint, customDeadline?: bigint) => {
    if (!poolAddress) return;
    setIsTrading(true);
    const deadline = customDeadline ?? BigInt(Math.floor(Date.now() / 1000) + 1200);
    try {
      const { request } = await publicClient.simulateContract({
        address: poolAddress,
        abi: kizashiPoolAbi,
        functionName: "trade",
        args: [[...delta], limitUsdc, deadline],
        account: owner,
      });
      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "success") {
        toast(copy.market.betPlaced, {
          action: {
            label: copy.tx.viewOnExplorer,
            onClick: () => {
              const url = txUrl(chainId, hash);
              if (url) window.open(url, "_blank");
            },
          },
        });
        await queryClient.invalidateQueries();
      } else {
        toast(copy.market.tradeFailed);
      }
    } catch {
      toast(copy.market.tradeFailed);
    } finally {
      setIsTrading(false);
    }
  };

  return {
    status: "ready",
    needsApproval,
    isApproving,
    isTrading,
    approve,
    trade,
  };
}

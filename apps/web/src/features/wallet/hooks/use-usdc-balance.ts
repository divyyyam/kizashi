"use client";

import { usdcAddressByChainId } from "@kizashi/contracts";
import { type Address, erc20Abi } from "viem";
import { useReadContract, useWatchContractEvent } from "wagmi";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { appChain } from "@/lib/wagmi";

/**
 * USDC balance of `account` in 6-decimal base units, read from the ERC-20 interface (never the
 * 18-decimal native balance). Refetches on Transfer events to or from the account, not per block.
 */
export function useUsdcBalance(account: Address | undefined): DataState<bigint> {
  const usdc = usdcAddressByChainId(appChain.id);
  const enabled = usdc !== undefined && account !== undefined;
  const balance = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account === undefined ? undefined : [account],
    chainId: appChain.id,
    query: { enabled },
  });
  const onTransfer = { enabled, onLogs: () => void balance.refetch() };
  useWatchContractEvent({
    ...onTransfer,
    address: usdc,
    abi: erc20Abi,
    eventName: "Transfer",
    args: { to: account },
  });
  useWatchContractEvent({
    ...onTransfer,
    address: usdc,
    abi: erc20Abi,
    eventName: "Transfer",
    args: { from: account },
  });

  if (usdc === undefined) return { status: "unavailable", reason: copy.unavailable.contracts };
  if (account === undefined) return { status: "unavailable", reason: copy.connect.notConnected };
  if (balance.isError) return { status: "error", message: copy.errors.network };
  if (balance.data === undefined) return { status: "loading" };
  return { status: "ready", data: balance.data };
}

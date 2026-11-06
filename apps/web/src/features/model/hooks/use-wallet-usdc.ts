"use client";

import { useAccount } from "wagmi";
import { useUsdcBalance } from "@/features/wallet";
import type { DataState } from "@/lib/data-state";

/** The connected wallet's USDC, which the budget chip compares the allotment against. */
export function useWalletUsdc(): DataState<bigint> {
  const { address } = useAccount();
  return useUsdcBalance(address);
}

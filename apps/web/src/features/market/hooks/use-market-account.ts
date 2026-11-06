"use client";
import { useAccount } from "wagmi";
export function useMarketAccount() {
  const { address, chainId, isConnected } = useAccount();
  return { owner: address, chainId, connected: isConnected };
}

"use client";
import { useAccount } from "wagmi";
export function usePortfolioAccount() {
  const { address, isConnected } = useAccount();
  return { owner: address, connected: isConnected };
}

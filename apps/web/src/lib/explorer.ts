import { chainById } from "@kizashi/contracts";
import type { Address, Hash } from "viem";

function explorerBase(chainId: number): string | undefined {
  return chainById(chainId)?.blockExplorers?.default.url;
}

/** Explorer page for an address, or undefined on chains without an explorer (anvil). */
export function addressUrl(chainId: number, address: Address): string | undefined {
  const base = explorerBase(chainId);
  return base === undefined ? undefined : `${base}/address/${address}`;
}

/** Explorer page for a transaction, or undefined on chains without an explorer (anvil). */
export function txUrl(chainId: number, hash: Hash): string | undefined {
  const base = explorerBase(chainId);
  return base === undefined ? undefined : `${base}/tx/${hash}`;
}

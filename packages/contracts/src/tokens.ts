import type { Address } from "viem";
import { getAddress } from "viem";
import { anvil, arcTestnet } from "./chains";

/** Decimals of the USDC ERC-20 interface. The 18-decimal native balance is never used for money. */
export const USDC_DECIMALS = 6;

/** anvil has no USDC until contracts deploy MockUSDC (C-04); consumers report it as unavailable. */
export const USDC_BY_CHAIN_ID: Readonly<Record<number, Address | undefined>> = {
  [arcTestnet.id]: getAddress("0x3600000000000000000000000000000000000000"),
  [anvil.id]: undefined,
};

export function usdcAddressByChainId(chainId: number): Address | undefined {
  return USDC_BY_CHAIN_ID[chainId];
}

import type { Address } from "viem";
import { getAddress } from "viem";
import { anvil, arcTestnet } from "./chains";

export const USDC_DECIMALS = 6;

export const USDC_BY_CHAIN_ID: Readonly<Record<number, Address | undefined>> = {
  [arcTestnet.id]: getAddress("0x3600000000000000000000000000000000000000"),
  [anvil.id]: undefined,
};

export function usdcAddressByChainId(chainId: number): Address | undefined {
  return USDC_BY_CHAIN_ID[chainId];
}

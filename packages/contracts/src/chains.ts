import { type Chain, defineChain, getAddress } from "viem";
import { foundry as anvil } from "viem/chains";

export { anvil };

/**
 * Arc testnet, values from https://docs.arc.io/arc/references/connect-to-arc and
 * https://docs.arc.io/arc/references/contract-addresses (checked 2026-11-06).
 * The native currency is USDC at 18 decimals; app maths uses the 6-decimal ERC-20 view only.
 */
export const arcTestnet: Chain = defineChain({
  id: 5_042_002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  blockExplorers: {
    default: { name: "Arc Testnet Explorer", url: "https://explorer.testnet.arc.io" },
  },
  contracts: {
    multicall3: { address: getAddress("0xcA11bde05977b3631167028862bE2a173976CA11") },
  },
  testnet: true,
});

export const SUPPORTED_CHAINS: readonly [Chain, Chain] = [arcTestnet, anvil];
export type SupportedChain = Chain;

export function chainById(id: number): SupportedChain | undefined {
  return SUPPORTED_CHAINS.find((chain) => chain.id === id);
}

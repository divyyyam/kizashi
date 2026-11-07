import { deploymentByChainId } from "@kizashi/contracts";
import { zeroAddress } from "viem";
import { appChain } from "@/lib/wagmi";
import type { CreateFormValues } from "../types";

export function createOracleSource(values: CreateFormValues, precision: number) {
  const twap = deploymentByChainId(appChain.id)?.twap;
  if (values.source === "uniswap-twap" && !twap) throw new Error("oracle unavailable");
  if (values.source === "uniswap-twap" && twap)
    return {
      key: twap.key,
      baseIsToken0: twap.baseIsToken0,
      baseDecimals: twap.baseDecimals,
      quoteDecimals: twap.quoteDecimals,
      gridDecimals: precision,
      window: twap.window,
      minObservations: twap.minObservations,
      minLiquidity: twap.minLiquidity,
    };
  return {
    key: {
      currency0: zeroAddress,
      currency1: zeroAddress,
      fee: 0,
      tickSpacing: 0,
      hooks: zeroAddress,
    },
    baseIsToken0: false,
    baseDecimals: 0,
    quoteDecimals: 0,
    gridDecimals: 0,
    window: 0,
    minObservations: 0,
    minLiquidity: 0n,
  };
}

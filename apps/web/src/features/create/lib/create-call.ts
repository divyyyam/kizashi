import { factoryAddress, kizashiMarketFactoryAbi, usdcAddressByChainId } from "@kizashi/contracts";
import type { Address } from "viem";
import { appChain } from "@/lib/wagmi";
import { type CreateFormValues, gridOf } from "../types";
import { createOracleSource } from "./create-oracle";

export function createCall(input: {
  owner: Address;
  values: CreateFormValues;
  subsidyUsdc: bigint;
  rulesRef: `0x${string}`;
}) {
  const { owner, values, subsidyUsdc, rulesRef } = input;
  const grid = gridOf(values);
  const factory = factoryAddress(appChain.id);
  const usdc = usdcAddressByChainId(appChain.id);
  if (!grid || !factory || !usdc) throw new Error("configuration unavailable");
  return {
    address: factory,
    abi: kizashiMarketFactoryAbi,
    functionName: "createMarket",
    account: owner,
    chain: appChain,
    args: [
      {
        config: { n: grid.n, lo: grid.lo, w: grid.w, collateral: usdc },
        subsidyUsdc,
        closeTime: BigInt(Math.floor(Date.parse(values.closesAt) / 1000)),
        kind: values.kind === "binary" ? 0 : 1,
        resolution: values.source === "manual" ? 1 : 2,
        rulesRef,
        priceSource: createOracleSource(values, grid.precision),
      },
    ],
  } as const;
}

"use client";

import { erc20Abi, usdcAddressByChainId } from "@kizashi/contracts";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { queryResult } from "@/lib/query-result";
import { boundedRead, RequestFailure } from "@/lib/request";

export function useAllowance({
  chainId,
  poolAddress,
  owner,
}: {
  chainId: number;
  poolAddress?: Address | undefined;
  owner?: Address | undefined;
}): DataState<bigint> {
  const client = usePublicClient({ chainId });
  const usdc = usdcAddressByChainId(chainId);
  const query = useQuery<bigint>({
    queryKey: ["allowance", chainId, usdc, owner, poolAddress],
    enabled: Boolean(client && usdc && poolAddress && owner),
    staleTime: 30_000,
    queryFn: ({ signal }) => {
      if (!client || !usdc || !poolAddress || !owner) throw new RequestFailure("service");
      return boundedRead(
        () =>
          client.readContract({
            address: usdc,
            abi: erc20Abi,
            functionName: "allowance",
            args: [owner, poolAddress],
          }),
        { signal },
      );
    },
  });
  return queryResult(query, copy.feedback.allowanceError);
}

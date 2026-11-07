import { createArkivReader, openMarkets } from "@kizashi/arkiv";
import { type Address, getAddress, isAddress } from "viem";
import { boundedRead } from "./request";

export async function readMarketListing(input: {
  writer: string | undefined;
  chainId: number;
  marketId: string;
  poolAddress: Address;
}) {
  if (!input.writer || !isAddress(input.writer)) return undefined;
  const writer = getAddress(input.writer);
  try {
    const reader = createArkivReader({ rpcUrl: "/api/arkiv" });
    const page = await boundedRead(
      () => openMarkets(reader, { owner: writer, arcChainId: input.chainId }),
      { timeoutMs: 5000 },
    );
    return page.items.find(
      (item) =>
        item.marketId === input.marketId &&
        item.arcAddress.toLowerCase() === input.poolAddress.toLowerCase(),
    );
  } catch {
    // Published descriptions are optional; their absence must not hide the chain snapshot.
    return undefined;
  }
}

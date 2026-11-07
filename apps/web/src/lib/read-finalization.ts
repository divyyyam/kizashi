import { DEPLOYMENT_5042002, kizashiPoolAbi, resolverAddress } from "@kizashi/contracts";
import { type Address, type PublicClient, parseAbiItem } from "viem";
import { boundedRead } from "./request";

export async function readFinalization(
  client: PublicClient,
  input: { chainId: number; poolAddress: Address; marketId: string },
) {
  const winningBucket = Number(
    await client.readContract({
      address: input.poolAddress,
      abi: kizashiPoolAbi,
      functionName: "winningBucket",
    }),
  );
  const resolver = resolverAddress(input.chainId);
  if (!resolver) return { winningBucket };
  try {
    const event = parseAbiItem(
      "event Finalized(uint256 indexed marketId, uint256 bucket, uint8 path)",
    );
    const logs = await boundedRead(
      () =>
        client.getLogs({
          address: resolver,
          event,
          args: { marketId: BigInt(input.marketId) },
          fromBlock: DEPLOYMENT_5042002.resolver.block,
        }),
      { timeoutMs: 5000 },
    );
    const log = logs[0];
    if (log)
      return {
        winningBucket,
        finalized: {
          bucket: Number(log.args.bucket),
          path: Number(log.args.path),
          transactionHash: log.transactionHash,
        },
      };
  } catch {
    // Event provenance is optional; the authoritative winning bucket above is still usable.
    return { winningBucket };
  }
  return { winningBucket };
}

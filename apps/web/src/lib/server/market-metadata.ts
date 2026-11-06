import { factoryAddress, kizashiMarketFactoryAbi } from "@kizashi/contracts";
import { type MarketMetadata, marketMetadataSchema } from "@kizashi/schemas/market";
import { bytesToString } from "viem";
import { rulesRefOf } from "@/lib/canonical-json";
import { arcReader } from "./arc";
import { fetchPinned, type PinataReady } from "./pinata";

export const MAX_METADATA_BYTES = 64 * 1024;
export const ARC_CHAIN_ID = 5042002;

export type VerifiedMetadata = {
  metadata: MarketMetadata;
  rulesRef: `0x${string}`;
  metadataCid: string;
};

export class MetadataError extends Error {
  constructor(
    readonly code: "not_found" | "mismatch" | "invalid" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

/** Reads rulesRef from the factory, fetches the CID from IPFS and checks the hash matches. */
export async function verifyMarketMetadata(
  pinata: PinataReady,
  marketId: bigint,
  metadataCid: string,
): Promise<VerifiedMetadata> {
  const factory = factoryAddress(ARC_CHAIN_ID);
  if (!factory) throw new MetadataError("unavailable", "no factory for Arc testnet");
  const arc = arcReader();
  const [pool, rulesRef] = await Promise.all([
    arc.readContract({
      address: factory,
      abi: kizashiMarketFactoryAbi,
      functionName: "poolOf",
      args: [marketId],
    }),
    arc.readContract({
      address: factory,
      abi: kizashiMarketFactoryAbi,
      functionName: "rulesRefOf",
      args: [marketId],
    }),
  ]);
  if (/^0x0{40}$/i.test(pool))
    throw new MetadataError("not_found", `market ${marketId} does not exist`);
  const bytes = await fetchPinned(pinata, metadataCid, MAX_METADATA_BYTES);
  if (rulesRefOf(bytes).toLowerCase() !== rulesRef.toLowerCase())
    throw new MetadataError(
      "mismatch",
      "IPFS metadata does not match the market's on-chain rulesRef",
    );
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytesToString(bytes));
  } catch {
    throw new MetadataError("invalid", "metadata is not JSON");
  }
  const result = marketMetadataSchema.safeParse(parsed);
  if (!result.success) throw new MetadataError("invalid", "metadata does not match schema v1");
  return { metadata: result.data, rulesRef, metadataCid };
}

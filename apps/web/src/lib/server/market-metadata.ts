import { factoryAddress, kizashiMarketFactoryAbi } from "@kizashi/contracts";
import { type MarketMetadata, marketMetadataSchema } from "@kizashi/schemas/market";
import { stringToBytes } from "viem";
import { rulesRefOf } from "@/lib/canonical-json";
import { arcReader } from "./arc";

export const MAX_RULES_BYTES = 64 * 1024;
export const ARC_CHAIN_ID = 5042002;

export type VerifiedMetadata = {
  metadata: MarketMetadata;
  rulesRef: `0x${string}`;
  rulesJson: string;
};

export class MetadataError extends Error {
  constructor(
    readonly code: "not_found" | "mismatch" | "invalid" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

/** Reads rulesRef from the factory and checks that keccak256(rulesJson) matches it. */
export async function verifyMarketRules(
  marketId: bigint,
  rulesJson: string,
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
  const bytes = stringToBytes(rulesJson);
  if (bytes.byteLength > MAX_RULES_BYTES) throw new MetadataError("invalid", "rules are too large");
  if (rulesRefOf(bytes).toLowerCase() !== rulesRef.toLowerCase())
    throw new MetadataError("mismatch", "the rules do not match the market's on-chain rulesRef");
  let parsed: unknown;
  try {
    parsed = JSON.parse(rulesJson);
  } catch {
    throw new MetadataError("invalid", "rules are not JSON");
  }
  const result = marketMetadataSchema.safeParse(parsed);
  if (!result.success) throw new MetadataError("invalid", "rules do not match schema v1");
  return { metadata: result.data, rulesRef, rulesJson };
}

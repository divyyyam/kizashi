import { listingByMarketId, publishMarketListing } from "@kizashi/arkiv";
import { factoryAddress, kizashiMarketFactoryAbi, kizashiPoolAbi } from "@kizashi/contracts";
import { z } from "zod";
import { arcReader } from "@/lib/server/arc";
import { arkivServerReader, listingWriter, serialised } from "@/lib/server/arkiv";
import {
  ARC_CHAIN_ID,
  MAX_RULES_BYTES,
  MetadataError,
  verifyMarketRules,
} from "@/lib/server/market-metadata";
import { allow, clientKey } from "@/lib/server/rate-limit";

// Publishes the Arkiv listing for a market that already exists on Arc. Nothing from the request
// is trusted except the marketId and the rules JSON: everything written comes from chain or from
// the rules document whose keccak256 the chain already commits to.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({
  marketId: z.string().regex(/^[1-9]\d{0,9}$/),
  rulesJson: z.string().min(2).max(MAX_RULES_BYTES),
});

const fail = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request): Promise<Response> {
  if (!allow(`listing:${clientKey(request)}`, 20, 10 * 60_000))
    return fail(429, "rate_limited", "Too many listing requests");
  const parsed = body.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return fail(400, "bad_request", "marketId and rulesJson are required");
  const writer = listingWriter();
  if (writer.status !== "ready") return fail(503, "arkiv_unavailable", writer.reason);

  const marketId = BigInt(parsed.data.marketId);
  try {
    const verified = await verifyMarketRules(marketId, parsed.data.rulesJson);
    const { metadata } = verified;
    const factory = factoryAddress(ARC_CHAIN_ID);
    if (!factory) return fail(503, "unavailable", "no factory");
    const arc = arcReader();
    const pool = await arc.readContract({
      address: factory,
      abi: kizashiMarketFactoryAbi,
      functionName: "poolOf",
      args: [marketId],
    });
    const [config, creator, state] = await Promise.all([
      arc.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "config" }),
      arc.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "creator" }),
      arc.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "state" }),
    ]);
    if (metadata.creator.toLowerCase() !== creator.toLowerCase())
      return fail(409, "bad_creator", "rules creator does not match the pool creator");
    const isBinary = metadata.outcomes.kind === "binary";
    const expectedN = isBinary
      ? 2n
      : BigInt(metadata.outcomes.kind === "curve" ? metadata.outcomes.buckets : 0);
    if (config.n !== expectedN)
      return fail(409, "bad_shape", "metadata outcomes do not match the pool");

    const reader = arkivServerReader();
    if (reader.status !== "ready") return fail(503, "arkiv_unavailable", reader.reason);
    const existing = await listingByMarketId(reader.value, parsed.data.marketId, {
      owner: writer.value.address,
      arcChainId: ARC_CHAIN_ID,
    }).catch(() => undefined);
    if (existing) return Response.json({ entityKey: existing.entityKey, existing: true });

    const outcomes = metadata.outcomes;
    const result = await serialised(() =>
      publishMarketListing(writer.value.client, {
        marketId: parsed.data.marketId,
        arcChainId: ARC_CHAIN_ID,
        kind: isBinary ? "binary" : "curve",
        status: state <= 1 ? "open" : state === 2 ? "closed" : "resolved",
        resolvesAtSec: metadata.closeTimeSec,
        arcAddress: pool,
        creator,
        rulesRef: verified.rulesRef,
        payload: {
          title: metadata.question.slice(0, 160),
          ...(metadata.description ? { description: metadata.description.slice(0, 1000) } : {}),
          resolution: metadata.resolution.source === "uniswap-twap" ? "twap" : "manual",
          subsidyUsdc: metadata.subsidyUsdc,
          closeTimeSec: metadata.closeTimeSec,
          grid: {
            n: Number(config.n),
            loGrid: config.lo.toString(),
            widthGrid: config.w.toString(),
            gridDecimals: outcomes.kind === "curve" ? outcomes.precision : 0,
            ...(outcomes.kind === "curve" ? { unit: outcomes.unit } : {}),
          },
          ...(outcomes.kind === "binary" ? { outcomeLabels: [outcomes.no, outcomes.yes] } : {}),
          category: metadata.category,
          rulesJson: verified.rulesJson,
        },
      }),
    );
    return Response.json({ entityKey: result.entityKey, txHash: result.txHash, existing: false });
  } catch (error) {
    if (error instanceof MetadataError)
      return fail(error.code === "not_found" ? 404 : 409, error.code, error.message);
    return fail(
      502,
      "arkiv_unavailable",
      error instanceof Error ? error.message.slice(0, 200) : "listing failed",
    );
  }
}

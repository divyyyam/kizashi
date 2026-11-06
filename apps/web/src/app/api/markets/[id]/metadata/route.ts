import { explorerEntityUrl, listingByMarketId } from "@kizashi/arkiv";
import { arkivServerReader, listingWriterAddress } from "@/lib/server/arkiv";
import { ARC_CHAIN_ID, MetadataError, verifyMarketMetadata } from "@/lib/server/market-metadata";
import { gatewayUrl, PinataError, pinataConfig } from "@/lib/server/pinata";

// Market metadata for the UI: listing (Arkiv) → CID → IPFS document → hash checked against the
// market's on-chain rulesRef. Returns a DataState-shaped body; never invents content.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cache = new Map<string, { at: number; body: unknown }>();
const TTL_MS = 60_000;

const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[1-9]\d{0,9}$/.test(id)) return reply({ status: "error", message: "bad market id" }, 400);
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return reply(hit.body);

  const body = await load(id);
  if (body.status === "ready" || body.status === "empty") cache.set(id, { at: Date.now(), body });
  return reply(body);
}

async function load(id: string) {
  const pinata = pinataConfig();
  if (pinata.status !== "ready") return { status: "unavailable", reason: pinata.reason } as const;
  const reader = arkivServerReader();
  if (reader.status !== "ready") return { status: "unavailable", reason: reader.reason } as const;
  const owner = listingWriterAddress();
  try {
    const listing = await listingByMarketId(reader.value, id, {
      arcChainId: ARC_CHAIN_ID,
      ...(owner ? { owner } : {}),
    });
    const cid = listing?.payload.metadataCid;
    if (!listing || !cid)
      return { status: "empty", reason: "This market has no published metadata." } as const;
    const verified = await verifyMarketMetadata(pinata, BigInt(id), cid);
    return {
      status: "ready",
      data: {
        metadata: verified.metadata,
        metadataCid: cid,
        metadataUrl: gatewayUrl(pinata.gateway, cid),
        imageUrl: verified.metadata.image
          ? gatewayUrl(pinata.gateway, verified.metadata.image.cid)
          : null,
        rulesRef: verified.rulesRef,
        listing: { entityKey: listing.entityKey, url: explorerEntityUrl(listing.entityKey) },
        verified: true,
      },
    } as const;
  } catch (error) {
    if (error instanceof MetadataError && error.code === "mismatch")
      return { status: "error", message: error.message } as const;
    if (error instanceof MetadataError)
      return { status: "unavailable", reason: error.message } as const;
    if (error instanceof PinataError)
      return { status: "unavailable", reason: error.message } as const;
    return { status: "unavailable", reason: "Arkiv or IPFS could not be reached" } as const;
  }
}

import { curveHistory } from "@kizashi/arkiv";
import { arkivServerReader } from "@/lib/server/arkiv";
import { ARC_CHAIN_ID } from "@/lib/server/market-metadata";

// Crowd history for the market page: Arkiv curveSnapshots written by the indexer wallet, reduced to
// the top outcome's probability per snapshot. Empty or unavailable is reported, never filled in.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WAD = 10n ** 18n;
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[1-9]\d{0,9}$/.test(id)) return reply({ status: "error", message: "bad market id" }, 400);
  const reader = arkivServerReader();
  if (reader.status !== "ready") return reply({ status: "unavailable", reason: reader.reason });
  const owner = process.env.NEXT_PUBLIC_ARKIV_INDEXER_WRITER;
  if (!owner || !/^0x[0-9a-fA-F]{40}$/.test(owner))
    return reply({ status: "unavailable", reason: "The Arkiv indexer writer is not configured." });
  try {
    const page = await curveHistory(reader.value, id, {
      owner: owner as `0x${string}`,
      arcChainId: ARC_CHAIN_ID,
    });
    const points = page.items.flatMap((item) => {
      const prices = item.payload.pricesWad.map((p) => BigInt(p));
      if (prices.length === 0) return [];
      const topBucket = prices.reduce((best, p, i) => (p > (prices[best] ?? 0n) ? i : best), 0);
      const top = prices[topBucket] ?? 0n;
      return [
        {
          entityKey: item.entityKey,
          tsSec: item.tsSec,
          topBucket,
          topProbabilityPpm: Number((top * 1_000_000n) / WAD),
        },
      ];
    });
    if (points.length === 0) return reply({ status: "empty" });
    return reply({ status: "ready", points });
  } catch {
    return reply({ status: "error", message: "Crowd history could not be loaded from Arkiv." });
  }
}

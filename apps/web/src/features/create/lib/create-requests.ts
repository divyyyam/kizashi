import { z } from "zod";
import { requestJson } from "@/lib/request";

const cid = z.string().min(20);
export const imageUploadSchema = z.object({
  cid,
  mime: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
});
export const metadataUploadSchema = z.object({
  cid,
  rulesRef: z.custom<`0x${string}`>(
    (value) => typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value),
  ),
});
const listingSchema = z.object({ entityKey: z.string().min(1) });

export function publishListing(marketId: bigint, metadataCid: string, signal?: AbortSignal) {
  return requestJson({
    url: "/api/markets/listing",
    schema: listingSchema,
    body: { marketId: marketId.toString(), metadataCid },
    signal,
    timeoutMs: 60_000,
  }).then((result) => result.entityKey);
}

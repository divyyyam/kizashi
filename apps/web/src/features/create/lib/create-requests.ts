import { z } from "zod";
import { requestJson } from "@/lib/request";

const listingSchema = z.object({ entityKey: z.string().min(1) });

export function publishListing(marketId: bigint, rulesJson: string, signal?: AbortSignal) {
  return requestJson({
    url: "/api/markets/listing",
    schema: listingSchema,
    body: { marketId: marketId.toString(), rulesJson },
    signal,
    timeoutMs: 60_000,
  }).then((result) => result.entityKey);
}

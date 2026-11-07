import { marketMetadataSchema } from "@kizashi/schemas/market";
import { z } from "zod";

const httpUrl = z.url().refine((value) => /^https?:\/\//.test(value));
const metadataViewSchema = z.object({
  metadata: marketMetadataSchema,
  metadataCid: z.string().min(1),
  metadataUrl: httpUrl,
  imageUrl: httpUrl.nullable(),
  rulesRef: z.custom<`0x${string}`>(
    (value) => typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value),
  ),
  listing: z.object({ entityKey: z.string().min(1), url: httpUrl }),
  verified: z.literal(true),
});

export type MarketMetaView = z.infer<typeof metadataViewSchema>;
export const metadataResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ready"), data: metadataViewSchema }),
  z.object({ status: z.literal("empty") }),
  z.object({ status: z.literal("unavailable"), reason: z.string() }),
  z.object({ status: z.literal("error"), message: z.string() }),
]);

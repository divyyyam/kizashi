import { z } from "zod";

export const crowdPointSchema = z.object({
  entityKey: z.string().min(1),
  tsSec: z.number().int().nonnegative().safe(),
  topBucket: z.number().int().min(0).max(63),
  topProbabilityPpm: z.number().int().min(0).max(1_000_000),
});
export type CrowdPoint = z.infer<typeof crowdPointSchema>;
export const crowdResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ready"), points: z.array(crowdPointSchema).min(1) }),
  z.object({ status: z.literal("empty") }),
  z.object({ status: z.literal("unavailable"), reason: z.string() }),
  z.object({ status: z.literal("error"), message: z.string() }),
]);
export type CrowdResponse = Exclude<z.infer<typeof crowdResponseSchema>, { status: "error" }>;

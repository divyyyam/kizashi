import { describe, expect, it } from "bun:test";
import { crowdResponseSchema } from "./crowd-response";

describe("crowd history boundary", () => {
  it("rejects missing or invalid points before a chart can read them", () => {
    for (const response of [
      { status: "ready" },
      { status: "ready", points: [] },
      {
        status: "ready",
        points: [{ entityKey: "snapshot", tsSec: 1, topBucket: 0, topProbabilityPpm: 1_000_001 }],
      },
    ])
      expect(crowdResponseSchema.safeParse(response).success).toBe(false);
  });
  it("accepts an explicit empty result and bounded recorded data", () => {
    expect(crowdResponseSchema.safeParse({ status: "empty" }).success).toBe(true);
    expect(
      crowdResponseSchema.safeParse({
        status: "ready",
        points: [{ entityKey: "snapshot", tsSec: 1, topBucket: 1, topProbabilityPpm: 500_000 }],
      }).success,
    ).toBe(true);
  });
});

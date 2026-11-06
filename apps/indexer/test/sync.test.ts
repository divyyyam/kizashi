import { describe, expect, it } from "bun:test";
import {
  type ArkivReader,
  type ArkivWriter,
  curveSnapshotPayloadSchema,
  encodePayload,
  marketPayloadSchema,
} from "@kizashi/arkiv";
import type { PublicClient } from "viem";
import type { TrackedMarket } from "../src/state";
import {
  canTransition,
  clampPriceWad,
  SerialQueue,
  shouldWriteSnapshot,
  syncCurveSnapshot,
  syncMarketStatus,
} from "../src/sync";

describe("throttle decisions", () => {
  it("shouldWriteSnapshot allows write when no previous snapshot exists", () => {
    expect(shouldWriteSnapshot(1000, undefined, 60)).toBe(true);
  });

  it("shouldWriteSnapshot skips write when under 60 s old", () => {
    expect(shouldWriteSnapshot(1059, 1000, 60)).toBe(false);
    expect(shouldWriteSnapshot(1005, 1000, 60)).toBe(false);
  });

  it("shouldWriteSnapshot allows write when exactly or over 60 s old", () => {
    expect(shouldWriteSnapshot(1060, 1000, 60)).toBe(true);
    expect(shouldWriteSnapshot(1100, 1000, 60)).toBe(true);
  });

  it("clampPriceWad clamps negative prices to 0", () => {
    expect(clampPriceWad(-500n)).toBe("0");
    expect(clampPriceWad(0n)).toBe("0");
    expect(clampPriceWad(1000000000000000000n)).toBe("1000000000000000000");
  });

  it("syncCurveSnapshot skips under 60s and writes after 60s", async () => {
    const queue = new SerialQueue();
    let publishedCount = 0;
    const mockWriter = {
      createEntity: async () => {
        publishedCount++;
        return { entityKey: "0xabc" as `0x${string}`, txHash: "0x123" as `0x${string}` };
      },
    } as unknown as ArkivWriter;

    const mockArcClient = {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === "b") return 1000000000000000000n;
        if (functionName === "q") return [0n, 0n];
        if (functionName === "prices") return [500000000000000000n, 500000000000000000n];
        if (functionName === "state") return 1; // open
        return 0n;
      },
      getBlock: async () => ({ timestamp: 1050n }),
    } as unknown as PublicClient;

    const mockReader = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                ownedBy: () => ({
                  fetch: async () => ({
                    entities: [
                      {
                        $key: "0x111",
                        marketId: { value: "1" },
                        ts: { value: 1000n },
                        block: { value: 100n },
                        payload: {
                          value: encodePayload(curveSnapshotPayloadSchema, {
                            bWad: "1000000000000000000",
                            qWad: ["0", "0"],
                            pricesWad: ["500000000000000000", "500000000000000000"],
                          }),
                        },
                      },
                    ],
                    skipped: 0,
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    } as unknown as ArkivReader;

    const market: TrackedMarket = {
      marketId: "1",
      poolAddress: "0x1111111111111111111111111111111111111111",
      status: "open",
      lastSnapshotTsSec: 1000,
    };

    // 1050 - 1000 = 50s (< 60s): should skip
    const res1 = await syncCurveSnapshot({
      arcClient: mockArcClient,
      arkivReader: mockReader,
      indexerWriter: mockWriter,
      queue,
      market,
      arcChainId: 5042002,
      indexerAddress: "0x2222222222222222222222222222222222222222",
      blockNumber: 105n,
      minIntervalSec: 60,
    });
    expect(res1.written).toBe(false);
    expect(publishedCount).toBe(0);

    // After 60s (timestamp 1070n): should write
    mockArcClient.getBlock = async () => ({ timestamp: 1070n });
    const res2 = await syncCurveSnapshot({
      arcClient: mockArcClient,
      arkivReader: mockReader,
      indexerWriter: mockWriter,
      queue,
      market,
      arcChainId: 5042002,
      indexerAddress: "0x2222222222222222222222222222222222222222",
      blockNumber: 110n,
      minIntervalSec: 60,
    });
    expect(res2.written).toBe(true);
    expect(publishedCount).toBe(1);
    expect(market.lastSnapshotTsSec).toBe(1070);
  });
});

describe("status transitions", () => {
  it("enforces valid status transitions and never moves backwards", () => {
    expect(canTransition("open", "closed")).toBe(true);
    expect(canTransition("open", "resolved")).toBe(true);
    expect(canTransition("closed", "resolved")).toBe(true);

    // Never backwards
    expect(canTransition("resolved", "closed")).toBe(false);
    expect(canTransition("resolved", "open")).toBe(false);
    expect(canTransition("closed", "open")).toBe(false);

    // No-op same status
    expect(canTransition("open", "open")).toBe(false);
    expect(canTransition("closed", "closed")).toBe(false);
    expect(canTransition("resolved", "resolved")).toBe(false);
  });

  it("syncMarketStatus skips when market has no listing", async () => {
    const queue = new SerialQueue();
    let patchedCount = 0;
    const mockWriter = {
      patchEntity: async () => {
        patchedCount++;
        return { txHash: "0x999" };
      },
    } as unknown as ArkivWriter;

    const mockReader = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                ownedBy: () => ({
                  fetch: async () => ({ entities: [], skipped: 0 }),
                }),
              }),
            }),
          }),
        }),
      }),
    } as unknown as ArkivReader;

    const res = await syncMarketStatus({
      reader: mockReader,
      listingWriter: mockWriter,
      queue,
      marketId: "404",
      targetStatus: "closed",
      arcChainId: 5042002,
      listingWriterAddress: "0x1111111111111111111111111111111111111111",
    });

    expect(res.patched).toBe(false);
    expect(patchedCount).toBe(0);
  });

  it("syncMarketStatus patches when transition is allowed and skips backwards", async () => {
    const queue = new SerialQueue();
    let lastPatchedStatus: string | undefined;
    const mockWriter = {
      patchEntity: async (
        _entity: unknown,
        _key: unknown,
        patch: { set?: { status?: { value?: string } } },
      ) => {
        lastPatchedStatus = patch.set?.status?.value ?? "unknown";
        return { txHash: "0x888" as `0x${string}` };
      },
    } as unknown as ArkivWriter;

    // Listing currently open
    let currentStatus = "open";
    const mockReader = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                ownedBy: () => ({
                  fetch: async () => ({
                    entities: [
                      {
                        $key: "0xentity1",
                        $owner: "0x1111111111111111111111111111111111111111",
                        $expiresAt: 9999999999n,
                        marketId: { value: "10" },
                        arcChainId: { value: 5042002n },
                        kind: { value: "binary" },
                        status: { value: currentStatus },
                        resolvesAt: { value: 1800000000n },
                        arcAddress: { value: "0xpool" },
                        creator: { value: "0xcreator" },
                        rulesRef: { value: "0xrules" },
                        payload: {
                          value: encodePayload(marketPayloadSchema, {
                            title: "Test Title",
                            resolution: "manual",
                            subsidyUsdc: "1000000",
                            closeTimeSec: 1800000000,
                            grid: {
                              n: 2,
                              loGrid: "0",
                              widthGrid: "1",
                              gridDecimals: 0,
                            },
                          }),
                        },
                      },
                    ],
                    skipped: 0,
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    } as unknown as ArkivReader;

    // open -> closed: allowed
    const res1 = await syncMarketStatus({
      reader: mockReader,
      listingWriter: mockWriter,
      queue,
      marketId: "10",
      targetStatus: "closed",
      arcChainId: 5042002,
      listingWriterAddress: "0x1111111111111111111111111111111111111111",
    });
    expect(res1.patched).toBe(true);
    expect(lastPatchedStatus).toBe("closed");

    // Once resolved, closed is rejected (never backwards)
    currentStatus = "resolved";
    const res2 = await syncMarketStatus({
      reader: mockReader,
      listingWriter: mockWriter,
      queue,
      marketId: "10",
      targetStatus: "closed",
      arcChainId: 5042002,
      listingWriterAddress: "0x1111111111111111111111111111111111111111",
    });
    expect(res2.patched).toBe(false);
  });
});

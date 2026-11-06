import {
  type ArkivReader,
  type ArkivWriter,
  curveHistory,
  listingByMarketId,
  publishCurveSnapshot,
  setMarketStatus,
} from "@kizashi/arkiv";
import type { Address, PublicClient } from "viem";
import { fetchPoolCurveData } from "./arc";
import type { MarketLifecycleStatus, TrackedMarket } from "./state";

export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = async () => task();
    const next = this.tail.then(run, run);
    this.tail = next;
    return next;
  }
}

export function canTransition(
  current: MarketLifecycleStatus,
  target: MarketLifecycleStatus,
): boolean {
  if (current === "open" && (target === "closed" || target === "resolved")) {
    return true;
  }
  if (current === "closed" && target === "resolved") {
    return true;
  }
  return false;
}

export function shouldWriteSnapshot(
  nowSec: number,
  lastSnapshotTsSec: number | undefined,
  minIntervalSec = 60,
): boolean {
  if (lastSnapshotTsSec === undefined) return true;
  return nowSec - lastSnapshotTsSec >= minIntervalSec;
}

export function clampPriceWad(price: bigint): string {
  return price < 0n ? "0" : price.toString();
}

export type StatusSyncResult = {
  patched: boolean;
  entityKey?: `0x${string}`;
  txHash?: `0x${string}`;
};

export async function syncMarketStatus(options: {
  reader: ArkivReader;
  listingWriter: ArkivWriter;
  queue: SerialQueue;
  marketId: string;
  targetStatus: "closed" | "resolved";
  arcChainId: number;
  listingWriterAddress: Address;
  log?: (data: Record<string, unknown>, msg: string) => void;
}): Promise<StatusSyncResult> {
  const {
    reader,
    listingWriter,
    queue,
    marketId,
    targetStatus,
    arcChainId,
    listingWriterAddress,
    log,
  } = options;
  try {
    const listing = await listingByMarketId(reader, marketId, {
      owner: listingWriterAddress,
      arcChainId,
    });
    if (!listing) return { patched: false };
    if (!canTransition(listing.status, targetStatus)) return { patched: false };

    const res = await queue.enqueue(async () => {
      return await setMarketStatus(listingWriter, listing.entityKey, targetStatus);
    });
    log?.(
      {
        marketId,
        action: "status_patch",
        entityKey: listing.entityKey,
        txHash: res.txHash,
        status: targetStatus,
      },
      "Market listing status patched",
    );
    return { patched: true, entityKey: listing.entityKey, txHash: res.txHash };
  } catch (error) {
    log?.({ marketId, action: "status_patch_failed", error: String(error) }, "Status patch failed");
    return { patched: false };
  }
}

export type SnapshotSyncResult = {
  written: boolean;
  entityKey?: `0x${string}`;
  txHash?: `0x${string}`;
};

export async function syncCurveSnapshot(options: {
  arcClient: PublicClient;
  arkivReader: ArkivReader;
  indexerWriter: ArkivWriter;
  queue: SerialQueue;
  market: TrackedMarket;
  arcChainId: number;
  indexerAddress: Address;
  blockNumber: bigint;
  minIntervalSec?: number;
  log?: (data: Record<string, unknown>, msg: string) => void;
}): Promise<SnapshotSyncResult> {
  const {
    arcClient,
    arkivReader,
    indexerWriter,
    queue,
    market,
    arcChainId,
    indexerAddress,
    blockNumber,
    minIntervalSec = 60,
    log,
  } = options;

  if (market.status !== "open") return { written: false };

  try {
    const data = await fetchPoolCurveData(arcClient, market.poolAddress, blockNumber);
    if (data.poolState !== 1) {
      market.status = data.poolState === 2 ? "closed" : "resolved";
      return { written: false };
    }
    if (!shouldWriteSnapshot(data.timestampSec, market.lastSnapshotTsSec, minIntervalSec)) {
      return { written: false };
    }

    const history = await curveHistory(arkivReader, market.marketId, {
      owner: indexerAddress,
      arcChainId,
    });
    const newest = history.items.at(-1);
    if (newest && data.timestampSec - newest.tsSec < minIntervalSec) {
      market.lastSnapshotTsSec = newest.tsSec;
      return { written: false };
    }

    const res = await queue.enqueue(async () => {
      return await publishCurveSnapshot(indexerWriter, {
        marketId: market.marketId,
        arcChainId,
        tsSec: data.timestampSec,
        block: blockNumber,
        payload: {
          bWad: data.b.toString(),
          qWad: data.q.map((v) => v.toString()),
          pricesWad: data.prices.map((v) => clampPriceWad(v)),
        },
      });
    });

    market.lastSnapshotTsSec = data.timestampSec;
    log?.(
      {
        marketId: market.marketId,
        action: "snapshot",
        entityKey: res.entityKey,
        txHash: res.txHash,
      },
      "Curve snapshot published",
    );
    return { written: true, entityKey: res.entityKey, txHash: res.txHash };
  } catch (error) {
    log?.(
      { marketId: market.marketId, action: "snapshot_failed", error: String(error) },
      "Snapshot write failed",
    );
    return { written: false };
  }
}

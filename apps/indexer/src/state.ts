import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DEPLOYMENT_5042002 } from "@kizashi/contracts";
import type { Address } from "viem";
import { getAddress } from "viem";

export type MarketLifecycleStatus = "open" | "closed" | "resolved";

export type TrackedMarket = {
  marketId: string;
  poolAddress: Address;
  status: MarketLifecycleStatus;
  lastSnapshotTsSec?: number | undefined;
};

export type IndexerState = {
  cursorBlock: bigint;
  markets: Record<string, TrackedMarket>;
};

export type SerializedIndexerState = {
  cursorBlock: string;
  markets: Record<
    string,
    {
      marketId: string;
      poolAddress: string;
      status: MarketLifecycleStatus;
      lastSnapshotTsSec?: number | undefined;
    }
  >;
};

export const DEFAULT_STATE_FILE = resolve(import.meta.dir, "../.state/cursor.json");

export function getInitialState(): IndexerState {
  const markets: Record<string, TrackedMarket> = {};
  for (const [id, m] of Object.entries(DEPLOYMENT_5042002.markets)) {
    markets[id] = {
      marketId: id,
      poolAddress: getAddress(m.pool),
      status: "open",
    };
  }
  return {
    cursorBlock: DEPLOYMENT_5042002.marketFactory.block,
    markets,
  };
}

export function loadState(filePath: string = DEFAULT_STATE_FILE): IndexerState {
  if (!existsSync(filePath)) {
    return getInitialState();
  }
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as SerializedIndexerState;
    const markets: Record<string, TrackedMarket> = {};
    for (const [id, m] of Object.entries(parsed.markets ?? {})) {
      markets[id] = {
        marketId: m.marketId,
        poolAddress: getAddress(m.poolAddress),
        status: m.status,
        lastSnapshotTsSec: m.lastSnapshotTsSec,
      };
    }
    return {
      cursorBlock: BigInt(parsed.cursorBlock),
      markets,
    };
  } catch {
    return getInitialState();
  }
}

export function saveState(state: IndexerState, filePath: string = DEFAULT_STATE_FILE): void {
  const serialized: SerializedIndexerState = {
    cursorBlock: state.cursorBlock.toString(),
    markets: {},
  };
  for (const [id, m] of Object.entries(state.markets)) {
    serialized.markets[id] = {
      marketId: m.marketId,
      poolAddress: m.poolAddress,
      status: m.status,
      lastSnapshotTsSec: m.lastSnapshotTsSec,
    };
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(serialized, null, 2), "utf-8");
}

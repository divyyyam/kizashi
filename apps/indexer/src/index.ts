import {
  arkivConfigFromEnv,
  createArkivReader,
  createArkivWriter,
  explorerEntityUrl,
} from "@kizashi/arkiv";
import { factoryAddress, resolverAddress } from "@kizashi/contracts";
import { Cron } from "croner";
import pino from "pino";
import type { Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  createArcClient,
  fetchFactoryCreated,
  fetchPoolEvents,
  fetchResolverFinalized,
  MAX_BLOCK_CHUNK,
} from "./arc";
import { parseEnv } from "./env";
import { loadState, saveState } from "./state";
import { canTransition, SerialQueue, syncCurveSnapshot, syncMarketStatus } from "./sync";

const logger = pino({
  name: "kizashi-indexer",
  level: "info",
});

const env = parseEnv(process.env);
const arkivConfigResult = arkivConfigFromEnv(process.env);
if (arkivConfigResult.status !== "ready") {
  throw new Error(`Arkiv configuration unavailable: ${arkivConfigResult.reason}`);
}

const indexerAccount = privateKeyToAccount(env.INDEXER_ARKIV_PRIVATE_KEY);
const listingAccount = privateKeyToAccount(env.LISTING_ARKIV_PRIVATE_KEY);

const arcClient = createArcClient(env.ARC_TESTNET_RPC_URL);
const arkivReader = createArkivReader(arkivConfigResult.config);
const indexerWriter = createArkivWriter({
  ...arkivConfigResult.config,
  account: indexerAccount,
  timeoutMs: 60_000,
});
const listingWriter = createArkivWriter({
  ...arkivConfigResult.config,
  account: listingAccount,
  timeoutMs: 60_000,
});

const indexerQueue = new SerialQueue();
const listingQueue = new SerialQueue();

const factory = factoryAddress(env.ARC_CHAIN_ID);
const resolver = resolverAddress(env.ARC_CHAIN_ID);
if (!factory || !resolver) {
  throw new Error(`Missing factory or resolver address for chain ${env.ARC_CHAIN_ID}`);
}
const factoryAddr: Address = factory;
const resolverAddr: Address = resolver;

const state = loadState();
let snapshotsWritten = 0;
let statusPatchesWritten = 0;
let isPolling = false;
let isShuttingDown = false;

const logAction = (data: Record<string, unknown>, msg: string) => {
  const url = typeof data.entityKey === "string" ? explorerEntityUrl(data.entityKey) : undefined;
  logger.info({ ...data, ...(url ? { explorerUrl: url } : {}) }, msg);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function minBigInt(a: bigint, b: bigint): bigint {
  return a <= b ? a : b;
}

async function processChunk(fromBlock: bigint, toBlock: bigint): Promise<void> {
  const created = await fetchFactoryCreated(arcClient, factoryAddr, fromBlock, toBlock);
  for (const c of created) {
    if (!state.markets[c.marketId]) {
      state.markets[c.marketId] = {
        marketId: c.marketId,
        poolAddress: c.pool,
        status: "open",
      };
      logger.info(
        { marketId: c.marketId, action: "market_tracked", pool: c.pool },
        "New market tracked",
      );
    }
  }

  const poolAddrs = Object.values(state.markets).map((m) => m.poolAddress);
  const poolByAddr = new Map<string, string>();
  for (const m of Object.values(state.markets)) {
    poolByAddr.set(m.poolAddress.toLowerCase(), m.marketId);
  }

  await sleep(200);
  const poolEvents = await fetchPoolEvents(arcClient, poolAddrs, fromBlock, toBlock);
  for (const e of poolEvents) {
    const marketId = poolByAddr.get(e.poolAddress.toLowerCase());
    if (!marketId) continue;
    const market = state.markets[marketId];
    if (!market) continue;

    if (e.eventName === "Traded") {
      const res = await syncCurveSnapshot({
        arcClient,
        arkivReader,
        indexerWriter,
        queue: indexerQueue,
        market,
        arcChainId: env.ARC_CHAIN_ID,
        indexerAddress: indexerAccount.address,
        blockNumber: e.blockNumber,
        minIntervalSec: env.INDEXER_SNAPSHOT_MIN_SEC,
        log: logAction,
      });
      if (res.written) snapshotsWritten++;
    } else if (e.eventName === "Closed" && canTransition(market.status, "closed")) {
      market.status = "closed";
      const res = await syncMarketStatus({
        reader: arkivReader,
        listingWriter,
        queue: listingQueue,
        marketId,
        targetStatus: "closed",
        arcChainId: env.ARC_CHAIN_ID,
        listingWriterAddress: listingAccount.address,
        log: logAction,
      });
      if (res.patched) statusPatchesWritten++;
    } else if (e.eventName === "Resolved" && canTransition(market.status, "resolved")) {
      market.status = "resolved";
      const res = await syncMarketStatus({
        reader: arkivReader,
        listingWriter,
        queue: listingQueue,
        marketId,
        targetStatus: "resolved",
        arcChainId: env.ARC_CHAIN_ID,
        listingWriterAddress: listingAccount.address,
        log: logAction,
      });
      if (res.patched) statusPatchesWritten++;
    }
  }

  await sleep(200);
  const finalized = await fetchResolverFinalized(arcClient, resolverAddr, fromBlock, toBlock);
  for (const f of finalized) {
    const market = state.markets[f.marketId];
    if (market && canTransition(market.status, "resolved")) {
      market.status = "resolved";
      const res = await syncMarketStatus({
        reader: arkivReader,
        listingWriter,
        queue: listingQueue,
        marketId: f.marketId,
        targetStatus: "resolved",
        arcChainId: env.ARC_CHAIN_ID,
        listingWriterAddress: listingAccount.address,
        log: logAction,
      });
      if (res.patched) statusPatchesWritten++;
    }
  }

  state.cursorBlock = toBlock + 1n;
  saveState(state);
}

async function poll(): Promise<void> {
  if (isPolling || isShuttingDown) return;
  isPolling = true;
  try {
    const latest = await arcClient.getBlockNumber();
    while (state.cursorBlock <= latest && !isShuttingDown) {
      const maxTo = state.cursorBlock + MAX_BLOCK_CHUNK - 1n;
      const toBlock = minBigInt(maxTo, latest);
      await processChunk(state.cursorBlock, toBlock);
      if (toBlock < latest) {
        await sleep(300);
      }
    }
  } catch (err) {
    logger.error({ action: "poll_error", error: String(err) }, "Log polling cycle failed");
  } finally {
    isPolling = false;
  }
}

async function runPeriodicSnapshots(): Promise<void> {
  if (isPolling || isShuttingDown) return;
  isPolling = true;
  try {
    const latestBlock = await arcClient.getBlockNumber();
    for (const market of Object.values(state.markets)) {
      if (market.status !== "open" || isShuttingDown) continue;
      await sleep(500);
      const res = await syncCurveSnapshot({
        arcClient,
        arkivReader,
        indexerWriter,
        queue: indexerQueue,
        market,
        arcChainId: env.ARC_CHAIN_ID,
        indexerAddress: indexerAccount.address,
        blockNumber: latestBlock,
        minIntervalSec: env.INDEXER_SNAPSHOT_MIN_SEC,
        log: logAction,
      });
      if (res.written) snapshotsWritten++;
    }
  } catch (err) {
    logger.error(
      { action: "cron_snapshot_error", error: String(err) },
      "15-minute snapshot cycle failed",
    );
  } finally {
    isPolling = false;
  }
}

// 15-minute cron for open markets
const cronJob = new Cron("*/15 * * * *", () => {
  void runPeriodicSnapshots();
});

// 60-second heartbeat
const heartbeatTimer = setInterval(() => {
  logger.info(
    {
      action: "heartbeat",
      cursorBlock: state.cursorBlock.toString(),
      marketsTracked: Object.keys(state.markets).length,
      snapshotsWritten,
      statusPatchesWritten,
    },
    "Indexer heartbeat",
  );
}, 60_000);

// Main poll timer
const pollTimer = setInterval(() => {
  void poll();
}, env.INDEXER_POLL_MS);

// Initial poll immediately, followed by snapshot pass for open markets
void poll().then(() => void runPeriodicSnapshots());

async function handleShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ action: "shutdown", signal }, "Stopping indexer worker gracefully...");
  clearInterval(pollTimer);
  clearInterval(heartbeatTimer);
  cronJob.stop();

  saveState(state);
  logger.info({ action: "shutdown_complete" }, "State saved. Exiting.");
  process.exit(0);
}

process.on("SIGTERM", () => void handleShutdown("SIGTERM"));
process.on("SIGINT", () => void handleShutdown("SIGINT"));

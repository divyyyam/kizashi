import { deploymentByChainId } from "@kizashi/contracts";
import { normalise } from "@kizashi/core";
import { type Address, type PublicClient, parseAbiItem } from "viem";
import { copy } from "@/content/copy";
import type { History } from "@/features/market";
import { boundedRead } from "./request";

const TRADED = parseAbiItem(
  "event Traded(address indexed owner, int256[] delta, int256 topUpWad, int256 chargeWad, int256 chargeUsdc)",
);
const RELEASED = parseAbiItem(
  "event Released(address indexed owner, int256 amountWad, uint256 paidUsdc)",
);
const LOG_CHUNK = 9000n;
const CACHE_LIMIT = 100;
type Entry = {
  block: bigint;
  index: number;
  delta?: readonly bigint[] | undefined;
  release?: bigint | undefined;
};
type Checkpoint = { block: bigint; hash: `0x${string}`; entries: readonly Entry[] };
const caches = new WeakMap<PublicClient, Map<string, Checkpoint>>();
type Input = {
  client: PublicClient;
  chainId: number;
  marketId: string;
  pool: Address;
  owner: Address;
  position: readonly bigint[];
  block: bigint;
  hash: `0x${string}`;
  signal?: AbortSignal | undefined;
};

export async function readTicketHistory(input: Input): Promise<History> {
  const deployment = deploymentByChainId(input.chainId);
  if (!deployment) return { status: "unavailable", reason: copy.market.historyUnavailable };
  const known = deployment.markets[input.marketId];
  const start =
    known?.pool.toLowerCase() === input.pool.toLowerCase() && known.block !== undefined
      ? known.block
      : deployment.marketFactory.block;
  const cache = caches.get(input.client) ?? new Map<string, Checkpoint>();
  caches.set(input.client, cache);
  const key = `${input.chainId}:${input.pool.toLowerCase()}:${input.owner.toLowerCase()}`;
  return boundedRead(
    async (signal) => {
      const checkpoint = await validCheckpoint(input, cache.get(key));
      const from = checkpoint ? checkpoint.block + 1n : start;
      const entries = [
        ...(checkpoint?.entries ?? []),
        ...(await readEntries({ ...input, signal }, from)),
      ];
      signal.throwIfAborted();
      const history = replayTickets(input.position, entries);
      if (history.status === "complete") {
        cache.delete(key);
        cache.set(key, { block: input.block, hash: input.hash, entries });
        if (cache.size > CACHE_LIMIT) {
          const oldest = cache.keys().next().value;
          if (oldest) cache.delete(oldest);
        }
      } else cache.delete(key);
      return history;
    },
    { signal: input.signal },
  );
}

async function validCheckpoint(input: Input, checkpoint: Checkpoint | undefined) {
  if (!checkpoint || checkpoint.block > input.block) return undefined;
  if (checkpoint.block === input.block)
    return checkpoint.hash === input.hash ? checkpoint : undefined;
  const anchor = await input.client.getBlock({ blockNumber: checkpoint.block });
  return anchor.hash === checkpoint.hash ? checkpoint : undefined;
}

async function readEntries(input: Input & { signal: AbortSignal }, from: bigint): Promise<Entry[]> {
  const entries: Entry[] = [];
  for (let start = from; start <= input.block; start += LOG_CHUNK) {
    input.signal.throwIfAborted();
    // biome-ignore lint/complexity/useMathMinMax: block numbers are bigint.
    const toBlock = start + LOG_CHUNK - 1n > input.block ? input.block : start + LOG_CHUNK - 1n;
    const request = {
      address: input.pool,
      args: { owner: input.owner },
      fromBlock: start,
      toBlock,
    };
    const [trades, releases] = await Promise.all([
      input.client.getLogs({ ...request, event: TRADED }),
      input.client.getLogs({ ...request, event: RELEASED }),
    ]);
    for (const event of trades)
      entries.push({ block: event.blockNumber, index: event.logIndex, delta: event.args.delta });
    for (const event of releases)
      entries.push({
        block: event.blockNumber,
        index: event.logIndex,
        release: event.args.amountWad,
      });
  }
  return entries.sort((a, b) =>
    a.block === b.block ? a.index - b.index : a.block < b.block ? -1 : 1,
  );
}

function replayTickets(position: readonly bigint[], entries: readonly Entry[]): History {
  let replay: readonly bigint[] = position.map(() => 0n);
  const tickets: (readonly bigint[])[] = [];
  for (const entry of entries) {
    if (entry.delta) {
      tickets.push(entry.delta);
      replay = normalise(replay, entry.delta).position;
    } else if (entry.release !== undefined) {
      const amount = entry.release;
      replay = replay.map((value) => value - amount);
    }
  }
  return replay.length === position.length &&
    replay.every((value, index) => value === position[index])
    ? { status: "complete", originalTicketsWad: tickets }
    : { status: "unavailable", reason: copy.market.historyUnavailable };
}

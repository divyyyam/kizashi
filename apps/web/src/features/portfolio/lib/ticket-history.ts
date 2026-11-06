import { normalise } from "@kizashi/core";
import { type Address, type PublicClient, parseAbiItem } from "viem";
import { copy } from "@/content/copy";
import type { History } from "@/features/market";

const traded = parseAbiItem(
  "event Traded(address indexed owner, int256[] delta, int256 topUpWad, int256 chargeWad, int256 chargeUsdc)",
);
const released = parseAbiItem(
  "event Released(address indexed owner, int256 amountWad, uint256 paidUsdc)",
);

const CHUNK = 9_000n;

type Entry = {
  block: bigint;
  index: number;
  delta?: readonly bigint[] | undefined;
  release?: bigint | undefined;
};

async function logsInChunks(
  client: PublicClient,
  pool: Address,
  owner: Address,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<Entry[]> {
  const entries: Entry[] = [];
  for (let start = fromBlock; start <= toBlock; start += CHUNK) {
    const end = start + CHUNK - 1n > toBlock ? toBlock : start + CHUNK - 1n;
    const [trades, releases] = await Promise.all([
      client.getLogs({
        address: pool,
        event: traded,
        args: { owner },
        fromBlock: start,
        toBlock: end,
      }),
      client.getLogs({
        address: pool,
        event: released,
        args: { owner },
        fromBlock: start,
        toBlock: end,
      }),
    ]);
    for (const l of trades)
      entries.push({ block: l.blockNumber, index: l.logIndex, delta: l.args.delta });
    for (const l of releases)
      entries.push({ block: l.blockNumber, index: l.logIndex, release: l.args.amountWad });
  }
  return entries.sort((a, b) =>
    a.block === b.block ? a.index - b.index : a.block < b.block ? -1 : 1,
  );
}

/**
 * Original tickets from the pool's Traded events, accepted only when replaying them (with the
 * pool's uniform top-up, minus releases) reproduces the on-chain position exactly.
 */
export async function fetchTicketHistory(
  client: PublicClient,
  pool: Address,
  owner: Address,
  fromBlock: bigint | undefined,
  position: readonly bigint[],
  toBlock: bigint,
): Promise<History> {
  const unavailable = { status: "unavailable", reason: copy.market.historyUnavailable } as const;
  if (fromBlock === undefined) return unavailable;
  try {
    const entries = await logsInChunks(client, pool, owner, fromBlock, toBlock);
    let replay: readonly bigint[] = position.map(() => 0n);
    const tickets: (readonly bigint[])[] = [];
    for (const e of entries) {
      if (e.delta) {
        tickets.push(e.delta);
        replay = normalise(replay, e.delta).position;
      } else if (e.release !== undefined) {
        const amount = e.release;
        replay = replay.map((x) => x - amount);
      }
    }
    const matches = replay.length === position.length && replay.every((x, i) => x === position[i]);
    return matches && tickets.length > 0
      ? { status: "complete", originalTicketsWad: tickets }
      : unavailable;
  } catch {
    return unavailable;
  }
}

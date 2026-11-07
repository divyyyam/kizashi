import { describe, expect, it } from "bun:test";
import { DEPLOYMENT_5042002 } from "@kizashi/contracts";
import type { Address, Hash, PublicClient } from "viem";
import { readTicketHistory } from "./ticket-history";

const START = DEPLOYMENT_5042002.marketFactory.block;
const WAD = 10n ** 18n;
const POOL: Address = `0x${"1".repeat(40)}`;
const OWNER: Address = `0x${"2".repeat(40)}`;
const HASH: Hash = `0x${"a".repeat(64)}`;
type LogRequest = { event: { name: string }; fromBlock: bigint; toBlock: bigint };

function reader() {
  const requests: LogRequest[] = [];
  const state = { phase: "initial", hash: HASH as Hash, fail: false };
  const client = {
    getBlock: async () => ({ hash: state.hash }),
    getLogs: async (request: LogRequest) => {
      requests.push(request);
      if (state.fail) throw new Error("RPC unavailable");
      if (state.phase === "empty") return [];
      if (request.event.name === "Traded" && request.fromBlock <= START + 1n)
        return [
          {
            blockNumber: START + 1n,
            logIndex: 0,
            args: { delta: state.phase === "reorg" ? [2n * WAD, 6n * WAD] : [4n * WAD, 8n * WAD] },
          },
        ];
      if (request.event.name === "Released" && state.phase === "release")
        return [{ blockNumber: START + 11n, logIndex: 1, args: { amountWad: 2n * WAD } }];
      return [];
    },
  } as unknown as PublicClient;
  return { client, requests, state };
}
function input(
  client: PublicClient,
  position: readonly bigint[],
  block = START + 10n,
  hash = HASH,
) {
  return {
    client,
    chainId: 5042002,
    marketId: "unlisted",
    pool: POOL,
    owner: OWNER,
    position,
    block,
    hash,
  };
}

describe("verified ticket history", () => {
  it("recognises a verified zero-ticket position as complete", async () => {
    const { client, state } = reader();
    state.phase = "empty";
    expect(await readTicketHistory(input(client, [0n, 0n]))).toEqual({
      status: "complete",
      originalTicketsWad: [],
    });
  });
  it("uses the real factory deployment block when a per-market block is missing", async () => {
    const { client, requests } = reader();
    expect((await readTicketHistory(input(client, [4n * WAD, 8n * WAD]))).status).toBe("complete");
    expect(requests[0]?.fromBlock).toBe(START);
  });
  it("reads only new logs after a verified checkpoint and includes releases", async () => {
    const { client, state, requests } = reader();
    await readTicketHistory(input(client, [4n * WAD, 8n * WAD]));
    requests.length = 0;
    state.phase = "release";
    expect(
      (
        await readTicketHistory(
          input(client, [2n * WAD, 6n * WAD], START + 12n, `0x${"b".repeat(64)}`),
        )
      ).status,
    ).toBe("complete");
    expect(requests).toHaveLength(2);
    expect(requests[0]?.fromBlock).toBe(START + 11n);
  });
  it("rescans if a checkpoint’s block hash changes", async () => {
    const { client, state, requests } = reader();
    await readTicketHistory(input(client, [4n * WAD, 8n * WAD]));
    requests.length = 0;
    state.phase = "reorg";
    state.hash = `0x${"c".repeat(64)}`;
    expect(
      (await readTicketHistory(input(client, [2n * WAD, 6n * WAD], START + 12n, state.hash)))
        .status,
    ).toBe("complete");
    expect(requests[0]?.fromBlock).toBe(START);
  });
  it("does not claim verified metrics for a mismatch or a failed log read", async () => {
    const { client, state } = reader();
    expect((await readTicketHistory(input(client, [1n, 1n]))).status).toBe("unavailable");
    state.fail = true;
    await expect(readTicketHistory(input(client, [4n * WAD, 8n * WAD]))).rejects.toThrow(
      "RPC unavailable",
    );
  });
});

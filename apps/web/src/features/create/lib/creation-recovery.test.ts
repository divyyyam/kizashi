import { afterEach, describe, expect, it, mock } from "bun:test";
import { arcTestnet } from "@kizashi/contracts";
import type { Address, Hash, PublicClient, WalletClient } from "viem";
import { CREATE_DEFAULTS } from "./form-defaults";

process.env.NEXT_PUBLIC_CHAIN_ID ??= String(arcTestnet.id);
process.env.NEXT_PUBLIC_ARC_RPC_URL ??= arcTestnet.rpcUrls.default.http[0];
const { createTransaction, CreationSubmittedError } = await import("./create-transaction");
afterEach(() => mock.restore());

const owner: Address = `0x${"1".repeat(40)}`;
const hash: Hash = `0x${"a".repeat(64)}`;
const rulesRef: Hash = `0x${"b".repeat(64)}`;
const values = { ...CREATE_DEFAULTS, closesAt: "2027-01-01T00:00:00" };

function context(options: { abortAfterSimulation?: AbortController; receiptFails?: boolean } = {}) {
  const events: string[] = [];
  const write = mock(async () => {
    events.push("write");
    return hash;
  });
  const client = {
    readContract: async () => 10_000_000n,
    simulateContract: async () => {
      events.push("simulate");
      options.abortAfterSimulation?.abort();
      return {};
    },
    waitForTransactionReceipt: async () => {
      if (options.receiptFails) throw new Error("connection lost");
      return { status: "success", logs: [] };
    },
  } as unknown as PublicClient;
  return {
    client,
    wallet: { writeContract: write } as unknown as WalletClient,
    owner,
    signal: options.abortAfterSimulation?.signal ?? new AbortController().signal,
    report: mock(() => undefined),
    write,
    events,
  };
}

describe("creation recovery", () => {
  it("retains the submitted hash when confirmation is interrupted", async () => {
    const run = context({ receiptFails: true });
    const failure = await createTransaction(run, {
      values,
      subsidyUsdc: 1_000_000n,
      rulesRef,
    }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(CreationSubmittedError);
    if (!(failure instanceof CreationSubmittedError))
      throw new Error("expected a submitted reference");
    expect(failure.hash).toBe(hash);
    expect(run.write).toHaveBeenCalledTimes(1);
    expect(run.events).toEqual(["simulate", "write"]);
  });
  it("does not submit after the owner or page cancels during simulation", async () => {
    const controller = new AbortController();
    const run = context({ abortAfterSimulation: controller });
    await expect(
      createTransaction(run, { values, subsidyUsdc: 1_000_000n, rulesRef }),
    ).rejects.toThrow();
    expect(run.write).not.toHaveBeenCalled();
  });
});

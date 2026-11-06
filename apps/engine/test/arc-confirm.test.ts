import { expect, test } from "bun:test";
import type { CompiledTrade } from "@kizashi/schemas/engine";
import { encodeAbiParameters, encodeEventTopics, getAddress, type TransactionReceipt } from "viem";
import { EngineServiceError } from "../src/errors";
import { poolAbi } from "../src/services/arc/abi";
import { verifyReceipt } from "../src/services/arc/confirm";
import { OWNER, POOL } from "./fixtures/arc";

const delta = ["0", "5", "5"];
const trade = {
  positionOwner: OWNER,
  payoutWad: delta,
  limitUsdc: "100",
  call: { to: POOL, data: "0x01" },
} as unknown as CompiledTrade;

function receipt(input: {
  owner?: string;
  delta?: string[];
  charge?: bigint;
  status?: "success" | "reverted";
}) {
  const topics = encodeEventTopics({
    abi: poolAbi,
    eventName: "Traded",
    args: { owner: getAddress(input.owner ?? OWNER) },
  });
  const data = encodeAbiParameters(
    [{ type: "int256[]" }, { type: "int256" }, { type: "int256" }, { type: "int256" }],
    [(input.delta ?? delta).map(BigInt), 0n, 1n, input.charge ?? 90n],
  );
  return {
    status: input.status ?? "success",
    transactionHash: `0x${"ab".repeat(32)}`,
    blockNumber: 7n,
    logs: [{ address: POOL, topics, data }],
  } as unknown as TransactionReceipt;
}

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error instanceof EngineServiceError ? error.code : "other";
  }
  return "none";
};

test("a receipt matching the approved owner, pool, delta and limit verifies", () => {
  expect(verifyReceipt({ receipt: receipt({}), from: OWNER, to: POOL, trade })).toMatchObject({
    chargeUsdc: "90",
    blockNumber: "7",
  });
});

test("a mismatched delta, owner, sender, target or charge is tx_mismatch", () => {
  expect(
    code(() =>
      verifyReceipt({ receipt: receipt({ delta: ["0", "5", "6"] }), from: OWNER, to: POOL, trade }),
    ),
  ).toBe("tx_mismatch");
  expect(
    code(() => verifyReceipt({ receipt: receipt({ owner: POOL }), from: OWNER, to: POOL, trade })),
  ).toBe("tx_mismatch");
  expect(code(() => verifyReceipt({ receipt: receipt({}), from: POOL, to: POOL, trade }))).toBe(
    "tx_mismatch",
  );
  expect(code(() => verifyReceipt({ receipt: receipt({}), from: OWNER, to: OWNER, trade }))).toBe(
    "tx_mismatch",
  );
  expect(
    code(() => verifyReceipt({ receipt: receipt({ charge: 101n }), from: OWNER, to: POOL, trade })),
  ).toBe("tx_mismatch");
});

test("a reverted receipt is tx_unconfirmed", () => {
  expect(
    code(() =>
      verifyReceipt({ receipt: receipt({ status: "reverted" }), from: OWNER, to: POOL, trade }),
    ),
  ).toBe("tx_unconfirmed");
});

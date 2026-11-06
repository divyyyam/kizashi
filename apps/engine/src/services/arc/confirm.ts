import type { CompiledTrade } from "@kizashi/schemas/engine";
import {
  type Address,
  decodeEventLog,
  type Hash,
  isAddressEqual,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { EngineServiceError } from "../../errors";
import { poolAbi } from "./abi";

const RECEIPT_TIMEOUT_MS = 45_000;

export type VerifiedTrade = {
  txHash: Hash;
  blockNumber: string;
  chargeUsdc: string;
  topUpWad: string;
};

function tradedLogs(receipt: TransactionReceipt, pool: Address) {
  return receipt.logs.flatMap((log) => {
    if (!isAddressEqual(log.address, pool)) return [];
    try {
      const event = decodeEventLog({ abi: poolAbi, data: log.data, topics: log.topics });
      return event.eventName === "Traded" ? [event.args] : [];
    } catch {
      return [];
    }
  });
}

/** Pure check of a mined receipt against the approved trade. Exported for tests. */
export function verifyReceipt(input: {
  receipt: TransactionReceipt;
  from: Address;
  to: Address | null;
  trade: CompiledTrade;
}): VerifiedTrade {
  const { receipt, trade } = input;
  const pool = trade.call.to as Address;
  if (receipt.status !== "success")
    throw new EngineServiceError("tx_unconfirmed", "The trade transaction reverted.", 409);
  if (
    !input.to ||
    !isAddressEqual(input.to, pool) ||
    !isAddressEqual(input.from, trade.positionOwner as Address)
  )
    throw new EngineServiceError(
      "tx_mismatch",
      "The transaction was not sent by the owner to the market pool.",
      409,
    );
  const [event, ...rest] = tradedLogs(receipt, pool);
  if (!event || rest.length > 0)
    throw new EngineServiceError("tx_mismatch", "Expected exactly one Traded event.", 409);
  const delta = event.delta.map(String);
  if (
    !isAddressEqual(event.owner, trade.positionOwner as Address) ||
    delta.length !== trade.payoutWad.length ||
    delta.some((value, index) => value !== trade.payoutWad[index]) ||
    event.chargeUsdc > BigInt(trade.limitUsdc)
  )
    throw new EngineServiceError(
      "tx_mismatch",
      "The traded delta, owner or charge differs from the approval.",
      409,
    );
  return {
    txHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber.toString(),
    chargeUsdc: event.chargeUsdc.toString(),
    topUpWad: event.topUpWad.toString(),
  };
}

export async function confirmOnArc(client: PublicClient, txHash: Hash, trade: CompiledTrade) {
  let receipt: TransactionReceipt;
  try {
    receipt = await client.waitForTransactionReceipt({ hash: txHash, timeout: RECEIPT_TIMEOUT_MS });
  } catch {
    throw new EngineServiceError(
      "tx_unconfirmed",
      "The trade transaction was not mined in time.",
      504,
    );
  }
  const tx = await client.getTransaction({ hash: txHash });
  if (tx.input.toLowerCase() !== trade.call.data.toLowerCase())
    throw new EngineServiceError("tx_mismatch", "The calldata differs from the approval.", 409);
  return verifyReceipt({ receipt, from: tx.from, to: tx.to, trade });
}

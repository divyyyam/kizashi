import type { CompiledTrade } from "@kizashi/schemas/engine";
import { keccak256, stringToHex } from "viem";

export function tradeIdentity(input: {
  runId: string;
  tick: number;
  rulesHash: string;
  trade: CompiledTrade;
  revision?: number;
}) {
  const { runId, tick, rulesHash, trade, revision = 0 } = input;
  return keccak256(
    stringToHex(
      JSON.stringify([
        runId,
        tick,
        revision,
        rulesHash.toLowerCase(),
        trade.chainId,
        trade.marketId,
        trade.positionOwner.toLowerCase(),
        trade.payoutWad,
        trade.limitUsdc,
        trade.deadlineSec,
        trade.call.to.toLowerCase(),
        trade.call.data.toLowerCase(),
      ]),
    ),
  );
}

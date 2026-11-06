import {
  collateralRequired,
  gaussianShape,
  maxSizeForBudget,
  mulDown,
  quoteTrade,
  range,
  step,
  toWad,
} from "@kizashi/core";
import type { CompiledTrade, planCandidateSchema, TickContext } from "@kizashi/schemas/engine";
import { encodeFunctionData, getAddress } from "viem";
import type { z } from "zod";
import { EngineServiceError } from "../../errors";
import type { EngineState } from "../../graph/state";
import { poolAbi } from "./abi";
import { type ArcReader, type PoolSnapshot, readPool } from "./context";

type Candidate = z.infer<typeof planCandidateSchema>;
const SLIPPAGE_BPS = 100n;
const BPS = 10_000n;
const TRADE_DEADLINE_SEC = 15 * 60;
const maxBig = (a: bigint, b: bigint) => (a >= b ? a : b);
const minBig = (a: bigint, b: bigint) => (a <= b ? a : b);

function bucketIndex(snapshot: PoolSnapshot, value: string) {
  const offset = BigInt(value) - snapshot.lo;
  if (offset % snapshot.w !== 0n)
    throw new EngineServiceError("bad_shape", "Shape edges must sit on bucket edges.", 422);
  return Number(offset / snapshot.w);
}

/** Unit payout shape (max entry 1e18) built with the @kizashi/core mirrors of Shapes.sol. */
export function unitShape(snapshot: PoolSnapshot, shape: Candidate["shape"]): bigint[] {
  const { n } = snapshot;
  const one = 10n ** 18n;
  try {
    if (shape.kind === "binary") {
      const k = bucketIndex(snapshot, shape.threshold);
      return shape.side === "above" ? step(n, k, one) : range(n, 0, k, one);
    }
    if (shape.kind === "range")
      return range(n, bucketIndex(snapshot, shape.from), bucketIndex(snapshot, shape.to), one);
    return gaussianShape(
      { n, lo: snapshot.lo, w: snapshot.w },
      BigInt(shape.mean),
      BigInt(shape.width),
    );
  } catch (error) {
    if (error instanceof EngineServiceError) throw error;
    throw new EngineServiceError("bad_shape", "The shape does not fit the market grid.", 422);
  }
}

/** Size the shape to the candidate's spend, quote it locally and on Arc at the same block. */
export async function compileCandidate(input: {
  arc: ArcReader;
  context: TickContext;
  candidate: Candidate;
  candidateIndex: number;
}): Promise<CompiledTrade> {
  const { arc, context, candidate, candidateIndex } = input;
  const owner = getAddress(context.positionOwner);
  const block = BigInt(context.fetchedAtBlock);
  const { snapshot } = await readPool(arc, candidate.marketId, owner, block);
  const unit = unitShape(snapshot, candidate.shape);
  const size = maxSizeForBudget(snapshot.q, snapshot.b, unit, toWad(BigInt(candidate.spendUsdc)));
  const delta = unit.map((value) => mulDown(value, size));
  if (delta.every((value) => value === 0n))
    throw new EngineServiceError("bad_request", "The spend is too small to trade.", 422);
  const local = quoteTrade(snapshot.q, snapshot.b, snapshot.position, delta);
  const chain = await arc.client.readContract({
    address: snapshot.pool,
    abi: poolAbi,
    functionName: "quote",
    args: [owner, delta],
    blockNumber: block,
  });
  const charge = maxBig(chain.chargeUsdc, local.chargeUsdc);
  const withSlippage = charge + (charge * SLIPPAGE_BPS + BPS - 1n) / BPS;
  const limitUsdc = maxBig(minBig(withSlippage, BigInt(candidate.spendUsdc)), 0n);
  const deadlineSec = context.nowSec + TRADE_DEADLINE_SEC;
  const before = collateralRequired(snapshot.position);
  const after = collateralRequired(local.positionAfter);
  return {
    candidateIndex,
    marketId: candidate.marketId,
    chainId: context.chainId,
    positionOwner: owner,
    quotedAtBlock: context.fetchedAtBlock,
    payoutWad: delta.map(String),
    localChargeWad: local.chargeWad.toString(),
    chainChargeWad: chain.chargeWad.toString(),
    chargeUsdc: local.chargeUsdc.toString(),
    limitUsdc: limitUsdc.toString(),
    topUpWad: local.topUpWad.toString(),
    collateralBeforeWad: before.toString(),
    collateralAfterWad: after.toString(),
    freedChangeWad: (before - after).toString(),
    deadlineSec,
    call: {
      to: snapshot.pool,
      data: encodeFunctionData({
        abi: poolAbi,
        functionName: "trade",
        args: [delta, limitUsdc, BigInt(deadlineSec)],
      }),
    },
  };
}

export function createCompiler(arc: ArcReader) {
  return async (state: EngineState, _signal: AbortSignal) => {
    if (state.plan?.action !== "trade" || !state.context)
      throw new EngineServiceError("plan_invalid", "No trade plan is available.", 409);
    const context = state.context;
    return Promise.all(
      state.plan.candidates.map((candidate, candidateIndex) =>
        compileCandidate({ arc, context, candidate, candidateIndex }),
      ),
    );
  };
}

/**
 * Before the user signs, re-read the pool at a fresh block and re-quote the SAME delta.
 * The vector, owner and call target must stay identical to what was approved.
 */
export function createQuoteRefresher(arc: ArcReader) {
  return async (state: EngineState, context: TickContext, _signal: AbortSignal) => {
    const selected = state.selected;
    if (!selected)
      throw new EngineServiceError("no_pending_interrupt", "No trade is selected.", 409);
    const owner = getAddress(context.positionOwner);
    const block = BigInt(context.fetchedAtBlock);
    const { snapshot } = await readPool(arc, selected.marketId, owner, block);
    const delta = selected.payoutWad.map(BigInt);
    const local = quoteTrade(snapshot.q, snapshot.b, snapshot.position, delta);
    const chain = await arc.client.readContract({
      address: snapshot.pool,
      abi: poolAbi,
      functionName: "quote",
      args: [owner, delta],
      blockNumber: block,
    });
    return {
      ...selected,
      quotedAtBlock: context.fetchedAtBlock,
      localChargeWad: local.chargeWad.toString(),
      chainChargeWad: chain.chargeWad.toString(),
      chargeUsdc: local.chargeUsdc.toString(),
    };
  };
}

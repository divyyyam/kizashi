import type { MarketContext, TickContext } from "@kizashi/schemas/engine";
import { type Address, getAddress, type PublicClient, zeroAddress } from "viem";
import { EngineServiceError } from "../../errors";
import type { EngineState } from "../../graph/state";
import { erc20Abi, factoryAbi, poolAbi } from "./abi";
import type { ArcDeployments } from "./client";

const STATES = ["uninitialized", "open", "closed", "resolved"] as const;
const USDC_TO_WAD = 10n ** 12n;

export type PoolSnapshot = {
  pool: Address;
  n: number;
  lo: bigint;
  w: bigint;
  b: bigint;
  q: bigint[];
  position: bigint[];
};

export type ArcReader = {
  client: PublicClient;
  deployments: ArcDeployments;
  chainId: number;
};

export async function poolAddress(arc: ArcReader, marketId: string, blockNumber: bigint) {
  if (!/^[1-9][0-9]*$/.test(marketId))
    throw new EngineServiceError("unknown_market", "Market ids are positive integers.", 404);
  const pool = await arc.client.readContract({
    address: arc.deployments.factory,
    abi: factoryAbi,
    functionName: "poolOf",
    args: [BigInt(marketId)],
    blockNumber,
  });
  if (pool === zeroAddress)
    throw new EngineServiceError("unknown_market", `Market ${marketId} does not exist.`, 404);
  return getAddress(pool);
}

/** Every read of one tick is pinned to the same block so local and chain quotes compare. */
export async function readPool(
  arc: ArcReader,
  marketId: string,
  owner: Address,
  blockNumber: bigint,
) {
  const address = await poolAddress(arc, marketId, blockNumber);
  const read = <F extends "config" | "state" | "closeTime" | "b" | "q" | "prices">(
    functionName: F,
  ) => arc.client.readContract({ address, abi: poolAbi, functionName, blockNumber });
  const [config, state, closeTime, b, q, prices, position, floor] = await Promise.all([
    read("config"),
    read("state"),
    read("closeTime"),
    read("b"),
    read("q"),
    read("prices"),
    arc.client.readContract({
      address,
      abi: poolAbi,
      functionName: "positionOf",
      args: [owner],
      blockNumber,
    }),
    arc.client.readContract({
      address,
      abi: poolAbi,
      functionName: "floorOf",
      args: [owner],
      blockNumber,
    }),
  ]);
  const label = STATES[state];
  if (!label || label === "uninitialized")
    throw new EngineServiceError("unknown_market", `Market ${marketId} is not initialized.`, 409);
  const n = Number(config.n);
  const snapshot: PoolSnapshot = {
    pool: address,
    n,
    lo: config.lo,
    w: config.w,
    b,
    q: [...q],
    position: position.length === n ? [...position] : Array.from({ length: n }, () => 0n),
  };
  const market: MarketContext = {
    marketId,
    question: `Kizashi market #${marketId}`,
    unit: "grid units",
    grid: {
      lo: config.lo.toString(),
      hi: (config.lo + config.w * config.n).toString(),
      count: n,
      precision: 0,
    },
    state: label,
    closeTimeSec: Number(closeTime),
    pricesWad: prices.map((value) => (value < 0n ? 0n : value).toString()),
    positionWad: snapshot.position.map((value) => value.toString()),
    releasableUsdc: (floor > 0n ? floor / USDC_TO_WAD : 0n).toString(),
  };
  return { snapshot, market };
}

export function createContextLoader(arc: ArcReader) {
  return async (state: EngineState, _signal: AbortSignal): Promise<TickContext> => {
    const owner = getAddress(state.vault ?? state.user);
    const blockNumber = await arc.client.getBlockNumber({ cacheTime: 0 });
    const [markets, balance] = await Promise.all([
      Promise.all(
        state.ruleSet.allowedMarketIds.map(
          async (id) => (await readPool(arc, id, owner, blockNumber)).market,
        ),
      ),
      arc.client.readContract({
        address: arc.deployments.usdc,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [owner],
        blockNumber,
      }),
    ]);
    return {
      chainId: arc.chainId,
      positionOwner: owner,
      fetchedAtBlock: blockNumber.toString(),
      nowSec: Math.floor(Date.now() / 1000),
      availableUsdc: balance.toString(),
      killSwitch: false,
      markets,
      spend: [],
    };
  };
}

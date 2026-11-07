import { RequestFailure } from "./request";

const MIN_BUCKETS = 2;
const MAX_BUCKETS = 64;

/** Refuse incomplete snapshots before a chart or quote can consume their vectors. */
export function validateMarketSnapshot(input: {
  count: number;
  width: bigint;
  liquidity: bigint;
  prices: readonly bigint[];
  quantities?: readonly bigint[];
}) {
  const { count, width, liquidity, prices, quantities } = input;
  if (
    !Number.isInteger(count) ||
    count < MIN_BUCKETS ||
    count > MAX_BUCKETS ||
    width <= 0n ||
    liquidity <= 0n ||
    prices.length !== count ||
    prices.some((price) => price < 0n) ||
    (quantities && quantities.length !== count)
  ) {
    throw new RequestFailure("invalid");
  }
}

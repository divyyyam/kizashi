import { prices, tradeCharge } from "./lse";
import { normalise } from "./netting";
import { add, type Vec } from "./vec";
import { chargeToUsdc } from "./wad";

export type TradeQuote = {
  chargeWad: bigint;
  chargeUsdc: bigint;
  topUpWad: bigint;
  normalizedDelta: bigint[];
  positionAfter: bigint[];
  pricesAfter: bigint[];
};

/** Off-chain mirror of KizashiPool.quote for a known q, b and owner position. */
export function quoteTrade(q: Vec, b: bigint, position: Vec, delta: Vec): TradeQuote {
  const { topUp, normalized, position: positionAfter } = normalise(position, delta);
  const chargeWad = tradeCharge(q, normalized, b);
  return {
    chargeWad,
    chargeUsdc: chargeToUsdc(chargeWad),
    topUpWad: topUp,
    normalizedDelta: normalized,
    positionAfter,
    pricesAfter: prices(add(q, normalized), b),
  };
}

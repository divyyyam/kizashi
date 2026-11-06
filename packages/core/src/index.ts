// @kizashi/core — bigint mirror of contracts/src/core (docs/formula/SPEC.md §6).

export { BUCKET_COUNT_MAX, BUCKET_COUNT_MIN, USDC_TO_WAD, WAD } from "./constants";
export { KizashiError, type KizashiErrorCode } from "./errors";
export { gaussianDisplay, pricesFloat } from "./float";
export { bounds, bucketOf, type Grid, validateGrid } from "./grid";
export {
  bFromSubsidy,
  costDown,
  costUp,
  lossBound,
  maxSizeForBudget,
  prices,
  tradeCharge,
} from "./lse";
export {
  crowdMedian,
  type Direction,
  type ExpressiveBet,
  expressiveToSimple,
  nearestThreshold,
  type SimpleBet,
  simpleToExpressive,
} from "./modes";
export {
  collateralRequired,
  floorOf,
  freed,
  grossCollateral,
  grossFloors,
  nettedCollateral,
  nettedFloor,
  normalise,
  topUp,
} from "./netting";
export { quoteTrade, type TradeQuote } from "./quote";
export { gaussianShape, normalCdf, range, sigmaBounds, step } from "./shapes";
export { add, addScalar, argMax, isNonNeg, maxOf, minOf, scale, sub, type Vec } from "./vec";
export {
  chargeToUsdc,
  divDown,
  divUp,
  expNegDown,
  expNegUp,
  lnAtLeastOneDown,
  lnAtLeastOneUp,
  mulDown,
  mulUp,
  toUsdcDown,
  toUsdcUp,
  toWad,
} from "./wad";

import { integrate, type NormalView, normalCdf, normalPdf, type OutcomeDomain } from "./normal";

export type BinarySide = "above" | "below";
export type BetShape = "binary" | "curve";

/** Everything needed to price one market. Stakes and returns are in US dollars. */
export type PricingInput = {
  readonly crowd: NormalView;
  readonly engine: NormalView;
  readonly threshold: number;
  readonly stakeUsd: number;
  readonly domain: OutcomeDomain;
};

export type BinaryQuote = {
  readonly side: BinarySide;
  /** Crowd-implied probability of the side, which is the price of one dollar of payout. */
  readonly price: number;
  readonly engineProbability: number;
  readonly payoutIfRightUsd: number;
  readonly expectedReturnUsd: number;
};

export type CurveQuote = {
  readonly center: number;
  readonly width: number;
  readonly peakPayoutUsd: number;
  readonly expectedReturnUsd: number;
};

export type BetComparison = {
  readonly binary: BinaryQuote;
  readonly curve: CurveQuote;
  readonly pick: BetShape;
};

export function sideProbability(view: NormalView, threshold: number, side: BinarySide): number {
  const below = normalCdf(threshold, view);
  return side === "below" ? below : 1 - below;
}

export function quoteBinarySide(input: PricingInput, side: BinarySide): BinaryQuote {
  const price = sideProbability(input.crowd, input.threshold, side);
  const engineProbability = sideProbability(input.engine, input.threshold, side);
  const payoutIfRightUsd = input.stakeUsd / price;
  return {
    side,
    price,
    engineProbability,
    payoutIfRightUsd,
    expectedReturnUsd: engineProbability * payoutIfRightUsd - input.stakeUsd,
  };
}

/** The side with the higher expected return under the engine's view. */
export function bestBinary(input: PricingInput): BinaryQuote {
  const above = quoteBinarySide(input, "above");
  const below = quoteBinarySide(input, "below");
  return above.expectedReturnUsd >= below.expectedReturnUsd ? above : below;
}

/** Settlement convention: an outcome exactly on the threshold counts as below. */
export function sideWins(x: number, threshold: number, side: BinarySide): boolean {
  return side === "above" ? x > threshold : x <= threshold;
}

export function binaryPayoutAt(x: number, quote: BinaryQuote, threshold: number): number {
  return sideWins(x, threshold, quote.side) ? quote.payoutIfRightUsd : 0;
}

/** Distribution-market payout: the stake scaled by how much more likely the engine finds x. */
export function curvePayoutAt(x: number, input: PricingInput): number {
  return (input.stakeUsd * normalPdf(x, input.engine)) / normalPdf(x, input.crowd);
}

export function quoteCurve(input: PricingInput): CurveQuote {
  const ratioMass = integrate(
    (x) => normalPdf(x, input.engine) ** 2 / normalPdf(x, input.crowd),
    input.domain,
  );
  return {
    center: input.engine.mean,
    width: input.engine.sd,
    peakPayoutUsd: curvePayoutAt(input.engine.mean, input),
    expectedReturnUsd: input.stakeUsd * ratioMass - input.stakeUsd,
  };
}

export function compareBets(input: PricingInput): BetComparison {
  const binary = bestBinary(input);
  const curve = quoteCurve(input);
  const pick = curve.expectedReturnUsd > binary.expectedReturnUsd ? "curve" : "binary";
  return { binary, curve, pick };
}

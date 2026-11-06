import { describe, expect, test } from "bun:test";
import { integrate, normalCdf, normalPdf } from "./normal";
import {
  binaryPayoutAt,
  compareBets,
  curvePayoutAt,
  type PricingInput,
  quoteBinarySide,
  quoteCurve,
} from "./pricing";

const SPEED: PricingInput = {
  crowd: { mean: 146, sd: 2.6 },
  engine: { mean: 146.8, sd: 1.1 },
  threshold: 147.5,
  stakeUsd: 5,
  domain: { lo: 125, hi: 165 },
};

/** Closed form of the integral of f_e^2 / f_c for two normals (valid while 2*sc^2 > se^2). */
function ratioMassClosedForm(input: PricingInput): number {
  const { crowd, engine } = input;
  const spread = 2 / engine.sd ** 2 - 1 / crowd.sd ** 2;
  const shift = (engine.mean - crowd.mean) ** 2 / (2 * crowd.sd ** 2 - engine.sd ** 2);
  return (crowd.sd / engine.sd ** 2 / Math.sqrt(spread)) * Math.exp(shift);
}

describe("normal helpers", () => {
  test("cdf is symmetric about the mean", () => {
    const view = { mean: 10, sd: 3 };
    expect(normalCdf(10, view)).toBeCloseTo(0.5, 6);
    expect(normalCdf(13, view) + normalCdf(7, view)).toBeCloseTo(1, 6);
    expect(normalCdf(13, view)).toBeCloseTo(0.841345, 5);
  });

  test("pdf integrates to one", () => {
    const view = { mean: 0, sd: 2 };
    expect(integrate((x) => normalPdf(x, view), { lo: -20, hi: 20 })).toBeCloseTo(1, 8);
  });
});

describe("binary quote", () => {
  test("prices each side at the crowd probability", () => {
    const above = quoteBinarySide(SPEED, "above");
    const below = quoteBinarySide(SPEED, "below");
    expect(above.price + below.price).toBeCloseTo(1, 9);
    expect(above.payoutIfRightUsd).toBeCloseTo(5 / above.price, 9);
  });

  test("is fair when the engine agrees with the crowd", () => {
    const fair = { ...SPEED, engine: SPEED.crowd };
    expect(quoteBinarySide(fair, "above").expectedReturnUsd).toBeCloseTo(0, 9);
    expect(quoteCurve(fair).expectedReturnUsd).toBeCloseTo(0, 6);
  });

  test("pays only on the chosen side of the threshold", () => {
    const below = quoteBinarySide(SPEED, "below");
    expect(binaryPayoutAt(147, below, SPEED.threshold)).toBeCloseTo(below.payoutIfRightUsd, 9);
    expect(binaryPayoutAt(148, below, SPEED.threshold)).toBe(0);
  });
});

describe("demo case: crowd has the side right but the shape wrong", () => {
  const result = compareBets(SPEED);

  test("best binary is below the threshold with a thin edge", () => {
    expect(result.binary.side).toBe("below");
    expect(result.binary.expectedReturnUsd).toBeCloseTo(0.137, 3);
  });

  test("curve return matches the closed form", () => {
    const expected = 5 * ratioMassClosedForm(SPEED) - 5;
    expect(result.curve.expectedReturnUsd).toBeCloseTo(expected, 6);
    expect(result.curve.expectedReturnUsd).toBeCloseTo(4.225, 3);
  });

  test("the curve clearly wins", () => {
    expect(result.pick).toBe("curve");
    expect(result.curve.expectedReturnUsd).toBeGreaterThan(10 * result.binary.expectedReturnUsd);
  });

  test("curve payout peaks at the engine mean", () => {
    expect(result.curve.peakPayoutUsd).toBeCloseTo(curvePayoutAt(146.8, SPEED), 9);
    expect(curvePayoutAt(146.8, SPEED)).toBeGreaterThan(curvePayoutAt(145, SPEED));
  });
});

test("a pure shift with the crowd's width favours the binary", () => {
  const margin: PricingInput = {
    crowd: { mean: 18, sd: 9 },
    engine: { mean: 24, sd: 9 },
    threshold: 21,
    stakeUsd: 5,
    domain: { lo: -30, hi: 70 },
  };
  const result = compareBets(margin);
  expect(result.pick).toBe("binary");
  expect(result.binary.side).toBe("above");
  expect(result.curve.expectedReturnUsd).toBeCloseTo(5 * ratioMassClosedForm(margin) - 5, 4);
});

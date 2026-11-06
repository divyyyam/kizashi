import { describe, expect, test } from "bun:test";
import { formatProbability, formatSignedUsd, formatUsd, parseBudgetUsdc, usdToUsdc } from "./money";

describe("parseBudgetUsdc", () => {
  test("reads whole and cent amounts", () => {
    expect(parseBudgetUsdc("20")).toBe(20_000_000n);
    expect(parseBudgetUsdc(" 12.5 ")).toBe(12_500_000n);
    expect(parseBudgetUsdc("0.05")).toBe(50_000n);
  });

  test("rejects empty, zero, negative and sub-cent input", () => {
    for (const input of ["", "0", "0.00", "-3", "1.234", "abc", "1e3"]) {
      expect(parseBudgetUsdc(input)).toBeNull();
    }
  });
});

describe("display", () => {
  test("rounds model dollars to base units", () => {
    expect(usdToUsdc(4.2251634)).toBe(4_225_163n);
    expect(formatUsd(6.963746)).toBe("$6.96");
  });

  test("keeps the sign of a return", () => {
    expect(formatSignedUsd(0.1373)).toBe("+$0.13");
    expect(formatSignedUsd(-0.3497)).toBe("-$0.34");
  });

  test("formats probabilities to one decimal", () => {
    expect(formatProbability(0.7180043)).toBe("71.8%");
  });
});

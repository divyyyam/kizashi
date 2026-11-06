import { describe, expect, test } from "bun:test";
import { formatAddress, formatGrid, formatPercent, formatUsdc, formatWad } from "./format";

// USDC: 1_000_000n = $1.00
describe("formatUsdc", () => {
  test("zero", () => {
    expect(formatUsdc(0n)).toBe("0.00");
  });

  test("1 base unit (sub-cent, should show < 0.01)", () => {
    expect(formatUsdc(1n)).toBe("< 0.01");
  });

  test("exactly 0.01 USDC (10_000 base units)", () => {
    expect(formatUsdc(10_000n)).toBe("0.01");
  });

  test("exactly $1.00", () => {
    expect(formatUsdc(1_000_000n)).toBe("1.00");
  });

  test("$1.23 (fractional)", () => {
    expect(formatUsdc(1_230_000n)).toBe("1.23");
  });

  test("large value with thousands separator ($12,345.67)", () => {
    expect(formatUsdc(12_345_670_000n)).toBe("12,345.67");
  });

  test("negative value ($-1.00)", () => {
    expect(formatUsdc(-1_000_000n)).toBe("-1.00");
  });

  test("negative sub-cent preserves the negative direction", () => {
    expect(formatUsdc(-1n)).toBe("> -0.01");
  });

  test("suffix option", () => {
    expect(formatUsdc(1_000_000n, { suffix: true })).toBe("1.00 USDC");
  });

  test("0.009999 USDC rounds to < 0.01", () => {
    expect(formatUsdc(9_999n)).toBe("< 0.01");
  });
});

describe("formatPercent", () => {
  const WAD = 10n ** 18n;

  test("0%", () => {
    expect(formatPercent(0n)).toBe("0.0%");
  });

  test("100%", () => {
    expect(formatPercent(WAD)).toBe("100.0%");
  });

  test("50%", () => {
    expect(formatPercent(WAD / 2n)).toBe("50.0%");
  });

  test("18.3% (183_000_000_000_000_000n)", () => {
    expect(formatPercent(183_000_000_000_000_000n)).toBe("18.3%");
  });

  test("1% (10_000_000_000_000_000n)", () => {
    expect(formatPercent(10_000_000_000_000_000n)).toBe("1.0%");
  });
});

describe("formatAddress", () => {
  test("standard 42-char address", () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;
    expect(formatAddress(addr)).toBe("0x1234…5678");
  });

  test("short input returned as-is", () => {
    const addr = "0x12" as `0x${string}`;
    expect(formatAddress(addr)).toBe("0x12");
  });
});

// Exact display boundaries added for the market and portfolio view models.
test("market precision preserves negative sub-unit values", () => {
  expect(formatGrid(-5n, 1)).toBe("-0.5");
  expect(formatGrid(1234n, 2)).toBe("12.34");
  expect(formatGrid(0n, 0)).toBe("0");
});
test("WAD display preserves nonzero amounts below a transfer unit", () => {
  expect(formatWad(1n)).toBe("< 0.01 USDC");
  expect(formatWad(-1n)).toBe("> -0.01 USDC");
  expect(formatWad(10n ** 18n)).toBe("1.00 USDC");
});

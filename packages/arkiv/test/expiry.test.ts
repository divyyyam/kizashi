import { describe, expect, test } from "bun:test";
import {
  DISPUTE_WINDOW_SEC,
  ExpiryRangeError,
  MARKET_GRACE_SEC,
  MAX_LIFETIME_SEC,
  marketExpiresAtSec,
  marketExpiry,
  proposalExpiry,
} from "../src";

describe("expiry", () => {
  test("dispute window matches KizashiResolver.DISPUTE_WINDOW (30 minutes)", () => {
    expect(DISPUTE_WINDOW_SEC).toBe(1800);
  });

  test("market listing lives through the dispute window", () => {
    expect(marketExpiresAtSec(1000)).toBe(1000 + DISPUTE_WINDOW_SEC + MARKET_GRACE_SEC);
  });

  test("market expiry is an absolute date with a 10-minute floor", () => {
    const e = marketExpiry(2_000_000_000, 1_999_990_000);
    expect(e.expiresAt).toBeInstanceOf(Date);
    expect(e.minLifetime).toBe(300n); // 600 s / 2 s blocks
  });

  test("refuses a listing beyond the chain maximum", () => {
    expect(() => marketExpiry(1_000_000 + MAX_LIFETIME_SEC, 1_000_000)).toThrow(ExpiryRangeError);
    expect(() => marketExpiresAtSec(0)).toThrow(ExpiryRangeError);
  });

  test("proposal lives 10 minutes", () => {
    expect(proposalExpiry().minLifetime).toBe(300n);
  });
});

import { describe, expect, test } from "bun:test";
import { axisTicks } from "./axis-ticks";

describe("curve axis labels", () => {
  test("keeps both endpoints without squeezing the last two labels together", () => {
    const ticks = [...axisTicks({ count: 16, width: 450, labelCharacters: 3 })];
    expect(ticks[0]).toBe(0);
    expect(ticks.at(-1)).toBe(16);
    for (let i = 1; i < ticks.length; i++) {
      expect((((ticks[i] ?? 0) - (ticks[i - 1] ?? 0)) * 450) / 16).toBeGreaterThanOrEqual(48);
    }
  });
  test("reduces mobile labels for long values", () => {
    const ticks = [...axisTicks({ count: 64, width: 280, labelCharacters: 12 })];
    expect(ticks).toEqual([0, 32, 64]);
  });
  test("never repeats a tick on a binary grid", () => {
    expect([...axisTicks({ count: 2, width: 800, labelCharacters: 1 })]).toEqual([0, 1, 2]);
  });
});

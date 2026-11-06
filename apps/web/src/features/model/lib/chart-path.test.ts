import { describe, expect, test } from "bun:test";
import { chartBox, densityArea, densityLine, densityToChart, xToChart } from "./chart-path";
import { closeInLabel } from "./close-in";

const VIEW = { mean: 146, sd: 2.6 };
const BOX = chartBox({ width: 200, height: 50 }, { lo: 136, hi: 156 }, [VIEW]);

describe("chart geometry", () => {
  test("maps the domain onto the chart width", () => {
    expect(xToChart(136, BOX)).toBe(0);
    expect(xToChart(146, BOX)).toBe(100);
    expect(xToChart(156, BOX)).toBe(200);
  });

  test("the tallest curve stays inside the chart", () => {
    expect(densityToChart(BOX.peak, BOX)).toBe(0);
    expect(densityToChart(0, BOX)).toBe(50);
    expect(densityLine(VIEW, BOX).startsWith("M0.00,")).toBe(true);
    expect(densityArea(VIEW, BOX).endsWith("L200,50 Z")).toBe(true);
  });
});

describe("closeInLabel", () => {
  test("uses the largest whole unit", () => {
    expect(closeInLabel(6 * 60, 0)).toBe("6 min");
    expect(closeInLabel(3 * 3600 + 59, 0)).toBe("3 h");
    expect(closeInLabel(20 * 86400, 0)).toBe("20 d");
    expect(closeInLabel(10, 0)).toBe("1 min");
  });
});

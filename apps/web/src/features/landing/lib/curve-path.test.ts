import { describe, expect, test } from "bun:test";
import { bucketPoints, smoothArea, smoothLine } from "./curve-path";

const frame = { width: 100, height: 50, top: 10 };

describe("bucketPoints", () => {
  test("centres buckets and puts the peak at the top inset", () => {
    const points = bucketPoints([0.25, 0.5, 0.25], frame, 0.5);
    expect(points[1]).toEqual({ x: 50, y: 10 });
    expect(points[0]?.y).toBe(30);
  });
  test("a zero peak lies on the baseline", () => {
    expect(bucketPoints([0, 0], frame, 0)[0]?.y).toBe(50);
  });
});

describe("paths", () => {
  test("empty input draws nothing", () => {
    expect(smoothLine([])).toBe("");
    expect(smoothArea([], frame)).toBe("");
  });
  test("one cubic segment per gap, area closes to the baseline", () => {
    const points = bucketPoints([0.2, 0.6, 0.2], frame, 0.6);
    expect(smoothLine(points).match(/C/g)?.length).toBe(2);
    expect(smoothArea(points, frame).endsWith("Z")).toBe(true);
  });
});

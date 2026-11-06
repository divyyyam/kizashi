import { describe, expect, test } from "bun:test";
import { centerPanel, PANEL_LAYOUT, zoomAt } from "./canvas";

describe("canvas camera", () => {
  test("zoom keeps the world point beneath the cursor fixed", () => {
    const camera = { x: -230, y: 80, zoom: 0.7 };
    const pointer = { x: 630, y: 390 };
    const next = zoomAt(camera, pointer, 1.3);
    expect((pointer.x - next.x) / next.zoom).toBeCloseTo((pointer.x - camera.x) / camera.zoom);
    expect((pointer.y - next.y) / next.zoom).toBeCloseTo((pointer.y - camera.y) / camera.zoom);
  });
  test("zoom limits still preserve the pointer anchor", () => {
    const camera = { x: 100, y: -50, zoom: 1 };
    expect(zoomAt(camera, { x: 100, y: -50 }, 100)).toEqual({ ...camera, zoom: 1.6 });
    expect(zoomAt(camera, { x: 100, y: -50 }, 0.01)).toEqual({ ...camera, zoom: 0.35 });
  });
  test("zooming out and back does not drift", () => {
    const camera = { x: -73, y: 42, zoom: 1 };
    const pointer = { x: 411, y: 279 };
    const restored = zoomAt(zoomAt(camera, pointer, 0.5), pointer, 1);
    expect(restored.x).toBeCloseTo(camera.x);
    expect(restored.y).toBeCloseTo(camera.y);
  });
  test("navigation centers a panel after it has been dragged far away", () => {
    const panel = { ...PANEL_LAYOUT.analysis, x: -6000, y: 4000 };
    const camera = centerPanel(1280, 760, panel);
    expect(camera.x + (panel.x + panel.width / 2) * camera.zoom).toBeCloseTo(640);
    expect(camera.y + (panel.y + panel.height / 2) * camera.zoom).toBeCloseTo(400);
  });
  test("mobile navigation fits the analysis width with room on both sides", () => {
    const panel = PANEL_LAYOUT.analysis;
    const camera = centerPanel(328, 480, panel);
    expect(panel.width * camera.zoom).toBeLessThanOrEqual(328 - 48);
    expect(camera.zoom).toBeGreaterThanOrEqual(0.35);
  });
});

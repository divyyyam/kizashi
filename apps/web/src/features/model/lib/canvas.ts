export type Point = { x: number; y: number };
export type Camera = Point & { zoom: number };
export const COMPACT_CANVAS_QUERY = "(width < 64rem)";

export function zoomAt(camera: Camera, point: Point, zoom: number): Camera {
  const next = Math.min(1.6, Math.max(0.35, zoom));
  const ratio = next / camera.zoom;
  return {
    x: point.x - (point.x - camera.x) * ratio,
    y: point.y - (point.y - camera.y) * ratio,
    zoom: next,
  };
}

export function centerPanel(
  width: number,
  height: number,
  panel: Point & { width: number; height: number },
): Camera {
  const zoom = Math.min(
    1,
    Math.max(0.35, Math.min((width - 48) / panel.width, (height - 100) / panel.height)),
  );
  return {
    x: (width - panel.width * zoom) / 2 - panel.x * zoom,
    y: (height - panel.height * zoom) / 2 - panel.y * zoom + 20,
    zoom,
  };
}

export const PANEL_LAYOUT = {
  context: { x: 0, y: 0, width: 260, height: 640 },
  analysis: { x: 310, y: 0, width: 760, height: 520 },
  markets: { x: 1130, y: 0, width: 540, height: 720 },
  collateral: { x: 310, y: 710, width: 760, height: 440 },
} as const;
export type PanelId = keyof typeof PANEL_LAYOUT;

import { Minus, Plus, RotateCcw } from "lucide-react";
import { canvasCopy } from "./canvas-copy";
import type { useModelCanvas } from "./use-model-canvas";

export function CanvasZoom({ canvas }: { canvas: ReturnType<typeof useModelCanvas> }) {
  return (
    <div data-canvas-dock className="model-zoom-dock">
      <button
        type="button"
        aria-label={canvasCopy.zoomOut}
        title={canvasCopy.zoomOut}
        onClick={() => canvas.zoom(1 / 1.15)}
      >
        <Minus aria-hidden className="size-4" />
      </button>
      <output aria-live="polite">{Math.round(canvas.camera.zoom * 100)}%</output>
      <button
        type="button"
        aria-label={canvasCopy.zoomIn}
        title={canvasCopy.zoomIn}
        onClick={() => canvas.zoom(1.15)}
      >
        <Plus aria-hidden className="size-4" />
      </button>
      <button
        type="button"
        aria-label={canvasCopy.reset}
        title={canvasCopy.reset}
        onClick={canvas.reset}
      >
        <RotateCcw aria-hidden className="size-4" />
      </button>
    </div>
  );
}

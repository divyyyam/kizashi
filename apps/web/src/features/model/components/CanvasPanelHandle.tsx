import { GripHorizontal } from "lucide-react";
import { useId } from "react";
import type { PanelId } from "../lib/canvas";
import { canvasCopy } from "./canvas-copy";
import type { useModelCanvas } from "./use-model-canvas";

type Props = { id: PanelId; canvas: ReturnType<typeof useModelCanvas> };

export function CanvasPanelHandle({ id, canvas }: Props) {
  const hint = useId();
  return (
    <>
      <button
        type="button"
        className="model-panel-handle"
        aria-label={canvasCopy.move(canvasCopy.panels[id])}
        aria-describedby={hint}
        onPointerDown={(event) => canvas.start(event, id)}
        onKeyDown={(event) => {
          const delta = event.shiftKey ? 40 : 10;
          const directions: Record<string, [number, number]> = {
            ArrowLeft: [-delta, 0],
            ArrowRight: [delta, 0],
            ArrowUp: [0, -delta],
            ArrowDown: [0, delta],
          };
          const direction = directions[event.key];
          if (direction) {
            event.preventDefault();
            canvas.nudge(id, ...direction);
          }
        }}
      >
        <span>{canvasCopy.panels[id]}</span>
        <GripHorizontal aria-hidden className="size-4" />
      </button>
      <span id={hint} className="sr-only">
        {canvasCopy.keyboard}
      </span>
    </>
  );
}

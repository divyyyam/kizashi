import { GripHorizontal } from "lucide-react";
import { type ReactNode, useId } from "react";
import { PANEL_LAYOUT, type PanelId } from "../lib/canvas";
import { canvasCopy } from "./canvas-copy";
import type { useModelCanvas } from "./use-model-canvas";

type Props = { id: PanelId; canvas: ReturnType<typeof useModelCanvas>; children: ReactNode };
export function CanvasPanel({ id, canvas, children }: Props) {
  const hint = useId();
  const position = canvas.panels[id];
  return (
    <section
      onFocusCapture={(event) => {
        const viewport = canvas.stage.current?.getBoundingClientRect();
        const target = event.target.getBoundingClientRect();
        if (
          viewport &&
          (target.left < viewport.left ||
            target.right > viewport.right ||
            target.top < viewport.top ||
            target.bottom > viewport.bottom)
        )
          canvas.focus(id);
      }}
      data-canvas-panel={id}
      aria-label={canvasCopy.panels[id]}
      className="model-canvas-panel"
      style={{
        left: position.x,
        top: position.y,
        width: PANEL_LAYOUT[id].width,
        zIndex: canvas.front === id ? 2 : 1,
      }}
    >
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
      <div
        data-panel-body
        className="model-panel-body"
        style={{ maxHeight: PANEL_LAYOUT[id].height - 44 }}
      >
        {children}
      </div>
    </section>
  );
}

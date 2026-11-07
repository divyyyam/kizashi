import type { CSSProperties, ReactNode } from "react";
import { PANEL_LAYOUT, type PanelId } from "../lib/canvas";
import { CanvasPanelHandle } from "./CanvasPanelHandle";
import { canvasCopy } from "./canvas-copy";
import type { useModelCanvas } from "./use-model-canvas";

type Props = { id: PanelId; canvas: ReturnType<typeof useModelCanvas>; children: ReactNode };
export function CanvasPanel({ id, canvas, children }: Props) {
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
      style={
        {
          "--panel-x": `${position.x}px`,
          "--panel-y": `${position.y}px`,
          "--panel-width": `${PANEL_LAYOUT[id].width}px`,
          "--panel-body-height": `${PANEL_LAYOUT[id].height - 44}px`,
          zIndex: canvas.front === id ? 2 : 1,
        } as CSSProperties
      }
    >
      <h2 className="model-panel-mobile-title">{canvasCopy.panels[id]}</h2>
      <CanvasPanelHandle id={id} canvas={canvas} />
      <div data-panel-body className="model-panel-body">
        {children}
      </div>
    </section>
  );
}

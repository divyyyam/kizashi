"use client";

import type { ReactNode } from "react";
import { PANEL_LAYOUT, type PanelId } from "../lib/canvas";
import { CanvasPanel } from "./CanvasPanel";
import { CanvasZoom } from "./CanvasZoom";
import { canvasCopy } from "./canvas-copy";
import { useModelCanvas } from "./use-model-canvas";

type Props = { panels: Record<PanelId, ReactNode>; focused: boolean };
export function ModelCanvas({ panels, focused }: Props) {
  const canvas = useModelCanvas(focused);
  return (
    <section
      ref={canvas.stage}
      className="model-canvas"
      data-dragging={canvas.dragging}
      aria-label={canvasCopy.label}
      onPointerDown={(event) => canvas.start(event)}
      onPointerMove={canvas.move}
      onPointerUp={canvas.end}
      onPointerCancel={canvas.end}
      onLostPointerCapture={canvas.end}
      style={{
        backgroundPosition: `${canvas.camera.x}px ${canvas.camera.y}px`,
        backgroundSize: `${24 * canvas.camera.zoom}px ${24 * canvas.camera.zoom}px`,
      }}
    >
      <nav data-canvas-dock className="model-canvas-nav" aria-label={canvasCopy.label}>
        {(Object.keys(PANEL_LAYOUT) as PanelId[])
          .filter((id) => !focused || id === "analysis")
          .map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={canvas.front === id}
              onClick={() => canvas.focus(id)}
            >
              {canvasCopy.panels[id]}
            </button>
          ))}
      </nav>
      <div
        className="model-canvas-world"
        style={{
          transform: `translate(${canvas.camera.x}px, ${canvas.camera.y}px) scale(${canvas.camera.zoom})`,
        }}
      >
        {(Object.keys(PANEL_LAYOUT) as PanelId[]).map((id) => (
          <div key={id} hidden={focused && id !== "analysis"}>
            <CanvasPanel id={id} canvas={canvas}>
              {panels[id]}
            </CanvasPanel>
          </div>
        ))}
      </div>
      <p className="model-canvas-hint">{canvasCopy.hint}</p>
      <CanvasZoom canvas={canvas} />
    </section>
  );
}

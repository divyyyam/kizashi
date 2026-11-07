"use client";
import {
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction,
  useRef,
  useState,
} from "react";
import { type Camera, COMPACT_CANVAS_QUERY, type PanelId, type Point } from "../lib/canvas";
import { useCanvasSpace } from "./use-canvas-input";

type Drag = { pointer: number; start: Point; origin: Point; panel: PanelId | null };
type Options = {
  cameraRef: RefObject<Camera>;
  panels: Record<PanelId, Point>;
  setPanels: Dispatch<SetStateAction<Record<PanelId, Point>>>;
  setCamera: Dispatch<SetStateAction<Camera>>;
  setFront: Dispatch<SetStateAction<PanelId>>;
};
export function useCanvasDrag({ cameraRef, panels, setPanels, setCamera, setFront }: Options) {
  const [dragging, setDragging] = useState(false);
  const drag = useRef<Drag | null>(null);
  const space = useCanvasSpace();
  function start(event: ReactPointerEvent<HTMLElement>, panel: PanelId | null = null) {
    if (window.matchMedia(COMPACT_CANVAS_QUERY).matches) return;
    if (event.button !== 0 && event.button !== 1) return;
    if (
      panel === null &&
      !space.current &&
      event.button !== 1 &&
      (event.target as HTMLElement).closest("[data-canvas-panel], [data-canvas-dock]")
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const moving = space.current || event.button === 1 ? null : panel;
    drag.current = {
      pointer: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: moving ? panels[moving] : cameraRef.current,
      panel: moving,
    };
    if (moving) setFront(moving);
    setDragging(true);
  }

  function move(event: ReactPointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    const scale = current.panel ? cameraRef.current.zoom : 1;
    const position = {
      x: current.origin.x + (event.clientX - current.start.x) / scale,
      y: current.origin.y + (event.clientY - current.start.y) / scale,
    };
    if (current.panel) setPanels((all) => ({ ...all, [current.panel as PanelId]: position }));
    else setCamera((value) => ({ ...value, ...position }));
  }

  function end() {
    drag.current = null;
    setDragging(false);
  }
  return { dragging, start, move, end };
}

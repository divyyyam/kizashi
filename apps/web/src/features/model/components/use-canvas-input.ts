"use client";
import { type Dispatch, type RefObject, type SetStateAction, useEffect, useRef } from "react";
import { type Camera, COMPACT_CANVAS_QUERY, zoomAt } from "../lib/canvas";

export function useCanvasWheel(
  stage: RefObject<HTMLElement | null>,
  setCamera: Dispatch<SetStateAction<Camera>>,
) {
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (window.matchMedia(COMPACT_CANVAS_QUERY).matches) return;
      const body = (event.target as HTMLElement).closest("[data-panel-body]");
      if (body && body.scrollHeight > body.clientHeight && !event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
      setCamera((current) =>
        event.ctrlKey || event.metaKey
          ? zoomAt(
              current,
              { x: event.clientX - rect.left, y: event.clientY - rect.top },
              current.zoom * Math.exp(-event.deltaY * unit * 0.008),
            )
          : { ...current, x: current.x - event.deltaX * unit, y: current.y - event.deltaY * unit },
      );
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [stage, setCamera]);
}

export function useCanvasSpace() {
  const space = useRef(false);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        event.code !== "Space" ||
        (event.target as HTMLElement).closest("input, textarea, button, select, [contenteditable]")
      )
        return;
      event.preventDefault();
      space.current = true;
    };
    const up = () => {
      space.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", up);
    };
  }, []);

  return space;
}

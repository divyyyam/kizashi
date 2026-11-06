"use client";

import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type Camera,
  centerPanel,
  PANEL_LAYOUT,
  type PanelId,
  type Point,
  zoomAt,
} from "../lib/canvas";

import { useCanvasDrag } from "./use-canvas-drag";
import { useCanvasWheel } from "./use-canvas-input";

const positions = () =>
  Object.fromEntries(
    Object.entries(PANEL_LAYOUT).map(([id, p]) => [id, { x: p.x, y: p.y }]),
  ) as Record<PanelId, Point>;

export function useModelCanvas(focused: boolean) {
  const stage = useRef<HTMLElement>(null);
  const [camera, setCamera] = useState<Camera>({ x: 24, y: 70, zoom: 0.8 });
  const [panels, setPanels] = useState(positions);
  const [front, setFront] = useState<PanelId>("analysis");
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const panelsRef = useRef(panels);
  panelsRef.current = panels;
  const gesture = useCanvasDrag({ cameraRef, panels, setPanels, setCamera, setFront });

  useCanvasViewport(stage, panelsRef, setCamera, setFront, focused);

  useCanvasWheel(stage, setCamera);
  function focus(id: PanelId) {
    const element = stage.current;
    if (!element) return;
    setFront(id);
    setCamera(
      centerPanel(element.clientWidth, element.clientHeight, {
        ...PANEL_LAYOUT[id],
        ...panels[id],
      }),
    );
  }
  function zoom(factor: number) {
    const element = stage.current;
    if (element)
      setCamera((value) =>
        zoomAt(
          value,
          { x: element.clientWidth / 2, y: element.clientHeight / 2 },
          value.zoom * factor,
        ),
      );
  }
  function reset() {
    setPanels(positions());
    const element = stage.current;
    if (element)
      setCamera(centerPanel(element.clientWidth, element.clientHeight, PANEL_LAYOUT.analysis));
  }
  function nudge(id: PanelId, dx: number, dy: number) {
    setPanels((all) => ({ ...all, [id]: { x: all[id].x + dx, y: all[id].y + dy } }));
  }
  return { stage, camera, panels, front, ...gesture, focus, zoom, reset, nudge };
}

function useCanvasViewport(
  stage: RefObject<HTMLElement | null>,
  panelsRef: RefObject<Record<PanelId, Point>>,
  setCamera: Dispatch<SetStateAction<Camera>>,
  setFront: Dispatch<SetStateAction<PanelId>>,
  focused: boolean,
) {
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    if (focused) setFront("analysis");
    const focus = () =>
      setCamera(
        centerPanel(element.clientWidth, element.clientHeight, {
          ...PANEL_LAYOUT.analysis,
          ...panelsRef.current.analysis,
        }),
      );
    focus();
    const observer = new ResizeObserver(focus);
    observer.observe(element);
    return () => observer.disconnect();
  }, [focused, stage, panelsRef, setCamera, setFront]);
}

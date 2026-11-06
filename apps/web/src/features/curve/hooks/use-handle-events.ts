"use client";
import type { KeyboardEvent, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { clampCurveParams } from "../lib/clamp";
import type { Geometry } from "../lib/geometry";
import { keyboardCurve } from "../lib/keyboard";
import type { CurveGrid, CurveParams } from "../types";
export function useHandleEvents({
  grid,
  value,
  geometry,
  onChange,
  field,
}: {
  grid: CurveGrid;
  value: CurveParams;
  geometry: Geometry;
  onChange: (value: CurveParams) => void;
  field: "mean" | "sigma";
}) {
  const [dragging, setDragging] = useState(false);
  const frame = useRef(0);
  const pending = useRef(value);
  const emit = (next: CurveParams) => {
    pending.current = next;
    if (!frame.current)
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        onChange(pending.current);
      });
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const next = keyboardCurve({
      key: event.key,
      shift: event.shiftKey,
      handle: field,
      grid,
      value,
    });
    if (next) {
      event.preventDefault();
      onChange(next);
    }
  };
  const onPointerDown = (event: PointerEvent<SVGGElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<SVGGElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const nextX = geometry.inverseX(
      ((event.clientX - rect.left) * svg.viewBox.baseVal.width) / rect.width,
    );
    emit(
      clampCurveParams(grid, {
        ...value,
        [field]: field === "mean" ? nextX : Math.abs(nextX - value.mean),
      }),
    );
  };
  const onPointerUp = (event: PointerEvent<SVGGElement>) => {
    setDragging(false);
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      onChange(pending.current);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return {
    dragging,
    onKeyDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onLostPointerCapture: () => setDragging(false),
  };
}

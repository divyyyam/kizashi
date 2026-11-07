"use client";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { InkPlate } from "./InkPlate";

type Device = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
function capable() {
  const device = navigator as Device;
  return (
    !device.connection?.saveData &&
    (device.deviceMemory ?? 8) > 2 &&
    (device.hardwareConcurrency || 8) > 2
  );
}
export function InkField() {
  const canvas = useRef<HTMLCanvasElement>(null),
    plate = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false),
    [available, setAvailable] = useState(false);
  useEffect(() => {
    const surface = canvas.current,
      art = plate.current,
      root = art?.closest("section");
    if (!surface || !art || !root || !capable()) return;
    const media = matchMedia("(prefers-reduced-motion: no-preference)");
    let dispose: (() => void) | undefined,
      revision = 0,
      frame = 0;
    function stop() {
      revision++;
      cancelAnimationFrame(frame);
      dispose?.();
      dispose = undefined;
    }
    function start() {
      stop();
      const current = revision;
      if (!surface || !art || !root || !media.matches || paused) return;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          void import("./animate-ink")
            .then(({ animateInk }) => {
              if (current !== revision) return;
              dispose = animateInk(root, surface, art);
              setAvailable(Boolean(dispose));
            })
            .catch(() => setAvailable(false));
        });
      });
    }
    const lost = () => {
      stop();
      setAvailable(false);
    };
    start();
    media.addEventListener("change", start);
    surface.addEventListener("webglcontextlost", lost);
    return () => {
      media.removeEventListener("change", start);
      surface.removeEventListener("webglcontextlost", lost);
      stop();
    };
  }, [paused]);
  return (
    <>
      <div ref={plate} className="hero-plate">
        <InkPlate />
      </div>
      <canvas key={paused ? "paused" : "running"} ref={canvas} className="ink-canvas" />
      <div className="field-caption" data-intro>
        {(available || paused) && (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            className="motion-control"
            aria-label={paused ? copy.motion.play : copy.motion.pause}
          >
            {paused ? <Play size={13} /> : <Pause size={13} />}
          </button>
        )}
      </div>
    </>
  );
}

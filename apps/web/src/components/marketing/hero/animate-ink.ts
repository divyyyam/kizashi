import { makeInk } from "./ink-renderer";

export function animateInk(root: HTMLElement, canvas: HTMLCanvasElement, plate: HTMLElement) {
  const scene = makeInk(canvas);
  if (!scene) return;
  let frame = 0,
    inView = false,
    elapsed = 0,
    last = 0,
    scroll = 0,
    seenPointer = false;
  const target = [-3, -3];
  function resize() {
    scene?.resize(root.getBoundingClientRect(), plate.getBoundingClientRect());
  }
  function onScroll() {
    const box = root.getBoundingClientRect();
    scroll = Math.min(1, Math.max(0, -box.top / box.height));
  }
  function move(event: PointerEvent) {
    const box = root.getBoundingClientRect();
    target[0] = (event.clientX - box.left) / box.width;
    target[1] = (event.clientY - box.top) / box.height;
    seenPointer = true;
  }
  function leave() {
    target[0] = -3;
    target[1] = -3;
  }
  function tick(now: number) {
    if (!scene) return;
    elapsed += last ? Math.min(now - last, 50) / 1000 : 0;
    last = now;
    scene.uniforms.time.value = elapsed;
    scene.uniforms.formation.value = Math.min(
      0.97,
      0.4 + (1 - Math.exp(-elapsed * 0.48)) * 0.41 + scroll * 0.45 + (seenPointer ? 0.06 : 0),
    );
    scene.uniforms.pointer.value = scene.uniforms.pointer.value.map(
      (n, i) => n + ((target[i] ?? -3) - n) * 0.16,
    );
    scene.draw();
    root.dataset.ink = "ready";
    frame = requestAnimationFrame(tick);
  }
  function visibility() {
    cancelAnimationFrame(frame);
    last = 0;
    if (inView && !document.hidden) frame = requestAnimationFrame(tick);
  }
  const intersection = new IntersectionObserver(([entry]) => {
    inView = Boolean(entry?.isIntersecting);
    visibility();
  });
  const observer = new ResizeObserver(resize);
  const theme = new MutationObserver(scene.recolour);
  resize();
  onScroll();
  intersection.observe(root);
  observer.observe(root);
  observer.observe(plate);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  root.addEventListener("pointermove", move);
  root.addEventListener("pointerleave", leave);
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", visibility);
  return () => {
    cancelAnimationFrame(frame);
    intersection.disconnect();
    observer.disconnect();
    theme.disconnect();
    delete root.dataset.ink;
    root.removeEventListener("pointermove", move);
    root.removeEventListener("pointerleave", leave);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", visibility);
    scene.dispose();
  };
}

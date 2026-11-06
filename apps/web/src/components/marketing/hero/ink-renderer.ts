import { Geometry, Mesh, Program, Renderer } from "ogl";
import { inkVertices } from "./ink-geometry";
import { fragment, vertex } from "./ink-shaders";

function tokenColour(tokens: CSSStyleDeclaration, name: string) {
  const hex = tokens.getPropertyValue(name).trim().slice(1);
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
}
export function makeInk(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("webgl", {
    alpha: true,
    depth: false,
    antialias: true,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: true,
  });
  if (!context) return;
  const renderer = new Renderer({
    canvas,
    webgl: 1,
    alpha: true,
    depth: false,
    antialias: true,
    dpr: Math.min(devicePixelRatio, 1.6),
  });
  const gl = renderer.gl;
  const geometry = new Geometry(gl, inkVertices());
  const uniforms = {
    frame: { value: [0, 0, 1, 1] },
    pointer: { value: [-3, -3] },
    time: { value: 0 },
    formation: { value: 0 },
    paper: { value: [1, 1, 1] },
    vermilion: { value: [1, 0, 0] },
  };
  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    cullFace: null,
  });
  const mesh = new Mesh(gl, { geometry, program, mode: gl.LINES, frustumCulled: false });
  const recolour = () => {
    const tokens = getComputedStyle(document.documentElement);
    uniforms.paper.value = tokenColour(tokens, "--color-text");
    uniforms.vermilion.value = tokenColour(tokens, "--color-curve-user");
  };
  recolour();
  return {
    uniforms,
    recolour,
    resize(bounds: DOMRect, plate: DOMRect) {
      renderer.setSize(bounds.width, bounds.height);
      uniforms.frame.value = [
        (plate.left - bounds.left) / bounds.width,
        (plate.top - bounds.top) / bounds.height,
        plate.width / bounds.width,
        plate.height / bounds.height,
      ];
    },
    draw() {
      renderer.render({ scene: mesh, sort: false, frustumCull: false });
    },
    dispose() {
      geometry.remove();
      program.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

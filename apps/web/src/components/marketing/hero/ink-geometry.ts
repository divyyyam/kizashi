// A stack of Gaussian sections, seen from a small angle. Coordinates are shared by SVG and WebGL.
export const FIELD = { width: 840, height: 510 } as const;
export function contour(t: number, depth: number) {
  const centre = 0.52 + depth * 0.135;
  const spread = 0.145 - depth * 0.025;
  const bell = Math.exp(-0.5 * ((t - centre) / spread) ** 2);
  const x = 9 + t * 718 + depth * 106;
  const y = 465 - depth * 142 - (280 + 74 * Math.sin(depth * Math.PI)) * bell;
  return [x, y] as const;
}
export function contourPath(depth: number, steps = 72) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const [x, y] = contour(i / steps, depth);
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join("");
}

export function inkVertices() {
  const layers = 75,
    segments = 136;
  const coordinates: number[] = [],
    attributes: number[] = [];
  for (let row = layers - 1; row >= 0; row--) {
    const depth = row / (layers - 1);
    for (let col = 0; col < segments; col++) {
      const id = row * segments + col;
      const seed = Math.sin((id + 1) * 12.9898) * 43758.5453;
      for (const end of [0, 1]) {
        const t = (col + end) / segments;
        const [x, y] = contour(t, depth);
        coordinates.push(x / FIELD.width, y / FIELD.height);
        attributes.push(seed - Math.floor(seed), depth, t, end);
      }
    }
  }
  return {
    position: { size: 2, data: new Float32Array(coordinates) },
    fibre: { size: 4, data: new Float32Array(attributes) },
  };
}

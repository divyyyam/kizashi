/** SVG geometry for the landing's illustrative curves. Pixels only; never used for money. */

export type Frame = { readonly width: number; readonly height: number; readonly top: number };

type Point = { readonly x: number; readonly y: number };

/** Bucket centres scaled so `peak` sits at the frame's top inset. */
export function bucketPoints(masses: readonly number[], frame: Frame, peak: number): Point[] {
  const n = masses.length;
  const usable = frame.height - frame.top;
  return masses.map((mass, i) => ({
    x: ((i + 0.5) / n) * frame.width,
    y: frame.height - (peak > 0 ? (mass / peak) * usable : 0),
  }));
}

const fixed = (value: number): string => value.toFixed(2);

/** Catmull-Rom through the points, emitted as cubic Béziers (tension 1/6). */
export function smoothLine(points: readonly Point[]): string {
  const [first] = points;
  if (first === undefined) return "";
  let d = `M${fixed(first.x)},${fixed(first.y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    if (p0 === undefined || p1 === undefined || p2 === undefined || p3 === undefined) break;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${fixed(c1.x)},${fixed(c1.y)} ${fixed(c2.x)},${fixed(c2.y)} ${fixed(p2.x)},${fixed(p2.y)}`;
  }
  return d;
}

/** The smooth line closed down to the baseline, for a filled area. */
export function smoothArea(points: readonly Point[], frame: Frame): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) return "";
  return `${smoothLine(points)} L${fixed(last.x)},${frame.height} L${fixed(first.x)},${frame.height} Z`;
}

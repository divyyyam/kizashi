import { contour, contourPath } from "./ink-geometry";

const FILAMENTS = Array.from({ length: 39 }, (_, i) => {
  const depth = 1 - i / 38;
  return { depth, path: contourPath(depth) };
});
const weft = Array.from({ length: 29 }, (_, i) =>
  Array.from({ length: 30 }, (_, j) => {
    const [x, y] = contour(i / 28, j / 29);
    return `${j ? "L" : "M"}${Math.round(x)} ${Math.round(y)}`;
  }).join(""),
).join("");

export function InkPlate() {
  return (
    <svg aria-hidden="true" className="ink-plate" viewBox="0 0 840 510" preserveAspectRatio="none">
      <g className="plate-weft" fill="none" strokeWidth=".8">
        <path d={weft} className="stroke-text" opacity=".11" />
        <path d="M9 465H727L833 323" className="stroke-text" opacity=".4" />
      </g>
      <g className="plate-filaments" fill="none" strokeWidth="1.15">
        {FILAMENTS.map(({ depth, path }) => (
          <path key={depth} d={path} className="stroke-text" opacity={0.18 + (1 - depth) * 0.44} />
        ))}
        <path d={contourPath(0.03)} className="stroke-curve-user" strokeWidth="2" />
        <path d={contourPath(0.48)} className="stroke-curve-user" strokeWidth="1.4" />
      </g>
    </svg>
  );
}

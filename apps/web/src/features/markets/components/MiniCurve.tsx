type MiniCurveProps = { prices: readonly bigint[] };
export function MiniCurve({ prices }: MiniCurveProps) {
  const width = 240;
  const height = 48;
  // biome-ignore lint/complexity/useMathMinMax: Math.max does not accept bigint.
  const peak = prices.reduce((a, b) => (a > b ? a : b), 1n);
  const points = prices.map(
    (price, i) =>
      `${((i + 0.5) * width) / prices.length},${height - (Number((price * 10000n) / peak) / 10000) * (height - 4)}`,
  );
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-16 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={`M0,${height} L${points.join(" L")} L${width},${height} Z`}
        className="fill-curve-crowd"
      />
      <path
        d={`M${points.join(" L")}`}
        pathLength={1}
        className="fill-none stroke-curve-user"
        strokeWidth={1.6}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

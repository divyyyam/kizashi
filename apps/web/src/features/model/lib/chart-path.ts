import { type NormalView, normalPdf, type OutcomeDomain } from "./normal";

/** SVG user space for one distribution chart; `peak` is the density drawn at the top edge. */
export type ChartBox = {
  readonly width: number;
  readonly height: number;
  readonly domain: OutcomeDomain;
  readonly peak: number;
};

const CURVE_SAMPLES = 120;
// Leaves a little air above the tallest curve so its stroke is never clipped.
const PEAK_HEADROOM = 1.08;

export function chartBox(
  size: { readonly width: number; readonly height: number },
  domain: OutcomeDomain,
  views: readonly NormalView[],
): ChartBox {
  const peak = Math.max(...views.map((view) => normalPdf(view.mean, view))) * PEAK_HEADROOM;
  return { ...size, domain, peak };
}

export function xToChart(x: number, box: ChartBox): number {
  return ((x - box.domain.lo) / (box.domain.hi - box.domain.lo)) * box.width;
}

export function densityToChart(density: number, box: ChartBox): number {
  return box.height - (density / box.peak) * box.height;
}

function samplePoints(view: NormalView, box: ChartBox): string[] {
  const step = (box.domain.hi - box.domain.lo) / CURVE_SAMPLES;
  return Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) => {
    const x = box.domain.lo + i * step;
    const px = xToChart(x, box).toFixed(2);
    const py = densityToChart(normalPdf(x, view), box).toFixed(2);
    return `${px},${py}`;
  });
}

export function densityLine(view: NormalView, box: ChartBox): string {
  return `M${samplePoints(view, box).join(" L")}`;
}

export function densityArea(view: NormalView, box: ChartBox): string {
  return `M0,${box.height} L${samplePoints(view, box).join(" L")} L${box.width},${box.height} Z`;
}

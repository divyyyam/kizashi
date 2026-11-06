import { modelCopy } from "@/content/model-copy";

type ChartLegendProps = {
  readonly threshold: string;
  readonly unit: string;
};

/** Key for the decision chart; the chart itself is aria-described by its own label. */
export function ChartLegend({ threshold, unit }: ChartLegendProps) {
  return (
    <ul aria-hidden className="flex flex-wrap gap-x-5 gap-y-2 text-small text-text-muted">
      <li className="flex items-center gap-2">
        <span className="h-2.5 w-5 rounded-sm border border-text-faint bg-curve-crowd" />
        {modelCopy.decision.crowd}
      </li>
      <li className="flex items-center gap-2">
        <span className="h-0.5 w-5 rounded-full bg-signal" />
        {modelCopy.decision.engine}
      </li>
      <li className="flex items-center gap-2">
        <span className="w-5 border-t border-dashed border-text-muted" />
        {modelCopy.decision.threshold(threshold, unit)}
      </li>
    </ul>
  );
}

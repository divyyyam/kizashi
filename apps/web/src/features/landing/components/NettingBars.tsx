import { copy } from "@/content/copy";
import { formatWad } from "@/lib/format";
import type { NettingSummary } from "../lib/netting-examples";

const text = copy.landing.netting;

/** Gross above netted on one scale, the freed amount labelled between them. */
export function NettingBars({ summary }: { readonly summary: NettingSummary }) {
  const scale = summary.grossWad > 0n ? summary.grossWad : 1n;
  return (
    <div className="flex flex-col gap-6">
      <Bar
        label={text.gross}
        help={text.grossHelp}
        valueWad={summary.grossWad}
        scaleWad={scale}
        muted
      />
      <div className="flex items-baseline justify-between gap-4 border-y border-dashed border-border py-4">
        <span className="text-label text-signal">{text.freed}</span>
        <span className="tabular text-h2 text-text">{formatWad(summary.freedWad)}</span>
      </div>
      <Bar
        label={text.netted}
        help={text.nettedHelp}
        valueWad={summary.nettedWad}
        scaleWad={scale}
      />
    </div>
  );
}

type BarProps = {
  readonly label: string;
  readonly help: string;
  readonly valueWad: bigint;
  readonly scaleWad: bigint;
  readonly muted?: boolean;
};

// Bar lengths are display geometry: a ratio of two exact amounts, in thousandths.
const RATIO_PRECISION = 1000n;

function Bar({ label, help, valueWad, scaleWad, muted = false }: BarProps) {
  const ratio = Number((valueWad * RATIO_PRECISION) / scaleWad) / Number(RATIO_PRECISION);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-small font-medium text-text">{label}</span>
          <span className="text-small text-text-faint">{help}</span>
        </div>
        <span className="tabular text-body text-text">{formatWad(valueWad)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-raised">
        <div
          className={
            muted
              ? "h-full origin-left bg-text-faint transition-transform duration-200 ease-out-soft"
              : "h-full origin-left bg-signal transition-transform duration-200 ease-out-soft"
          }
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
    </div>
  );
}

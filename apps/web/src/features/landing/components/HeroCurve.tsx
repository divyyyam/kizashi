"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { copy } from "@/content/copy";
import { formatPercent } from "@/lib/format";
import {
  clampSigma,
  HERO_LOW,
  heroCurve,
  MEAN_START,
  SIGMA_MAX,
  SIGMA_MIN,
  SIGMA_START,
  SIGMA_STEP,
  shareToWad,
} from "../lib/hero-grid";
import { CurvePlot } from "./CurvePlot";

const curveCopy = copy.landing.curve;

/** The hero's interactive card: drag or use arrow keys to move the mean, buttons set the width. */
export function HeroCurve() {
  const [mean, setMean] = useState(MEAN_START);
  const [sigma, setSigma] = useState(SIGMA_START);
  const curve = heroCurve(mean, sigma);
  const peakLow = HERO_LOW + curve.peakBucket;

  return (
    <figure
      data-enter
      data-hero="card"
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface"
    >
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <span className="text-label text-text-muted">{curveCopy.label}</span>
        <span className="hidden text-small text-text-faint sm:inline">{curveCopy.grid}</span>
      </header>
      <CurvePlot curve={curve} mean={mean} onMean={setMean} />
      <dl
        data-hero="readout"
        className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4"
      >
        <Readout term={curveCopy.mean} value={`${mean.toFixed(1)} ${curveCopy.unit}`} />
        <Readout term={curveCopy.width} value={sigma.toFixed(1)} />
        <Readout term={curveCopy.peak} value={`${peakLow}–${peakLow + 1}`} />
        <Readout term={curveCopy.share} value={formatPercent(shareToWad(curve.peakShare))} />
      </dl>
      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
        <figcaption className="text-small text-text-faint">{curveCopy.caption}</figcaption>
        <div className="flex shrink-0 gap-1">
          <WidthButton
            label={curveCopy.narrow}
            disabled={sigma <= SIGMA_MIN}
            onClick={() => setSigma(clampSigma(sigma - SIGMA_STEP))}
            icon={Minus}
          />
          <WidthButton
            label={curveCopy.widen}
            disabled={sigma >= SIGMA_MAX}
            onClick={() => setSigma(clampSigma(sigma + SIGMA_STEP))}
            icon={Plus}
          />
        </div>
      </div>
    </figure>
  );
}

function Readout({ term, value }: { readonly term: string; readonly value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-surface px-5 py-3">
      <dt className="text-label text-text-faint">{term}</dt>
      <dd className="tabular text-small text-text">{value}</dd>
    </div>
  );
}

type WidthButtonProps = {
  readonly label: string;
  readonly disabled: boolean;
  readonly onClick: () => void;
  readonly icon: typeof Plus;
};

function WidthButton({ label, disabled, onClick, icon: Icon }: WidthButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-md border border-border text-text-muted transition-colors duration-120 hover:border-border-strong hover:text-text disabled:opacity-40"
    >
      <Icon aria-hidden strokeWidth={1.5} className="size-4" />
    </button>
  );
}

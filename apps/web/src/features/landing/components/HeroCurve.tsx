"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { copy } from "@/content/copy";
import { formatPercent } from "@/lib/format";
import { HERO_LOW, heroCurve, MEAN_START, SIGMA_START, shareToWad } from "../lib/hero-grid";
import { CurvePlot } from "./CurvePlot";
import { ForecastControls } from "./ForecastControls";
import "./forecast.css";

const text = copy.landing.curve;

export function HeroCurve() {
  const [mean, setMean] = useState(MEAN_START);
  const [sigma, setSigma] = useState(SIGMA_START);
  const curve = heroCurve(mean, sigma);
  const peakLow = HERO_LOW + curve.peakBucket;
  return (
    <figure className="hero-forecast" data-hero="card">
      <ForecastHeading
        onReset={() => {
          setMean(MEAN_START);
          setSigma(SIGMA_START);
        }}
      />
      <div className="forecast-context">{text.grid}</div>
      <div className="forecast-summary">
        <div>
          <span>{text.peak}</span>
          <strong>
            {peakLow}–{peakLow + 1} <small>{text.unit}</small>
          </strong>
        </div>
        <div>
          <span>{text.share}</span>
          <strong>{formatPercent(shareToWad(curve.peakShare))}</strong>
        </div>
      </div>
      <CurvePlot curve={curve} mean={mean} onMean={setMean} />
      <div className="forecast-legend">
        <span>{text.crowd}</span>
        <span>{text.yours}</span>
      </div>
      <ForecastControls mean={mean} sigma={sigma} onMean={setMean} onSigma={setSigma} />
      <figcaption>{text.caption}</figcaption>
    </figure>
  );
}

function ForecastHeading({ onReset }: { onReset: () => void }) {
  return (
    <header className="forecast-heading">
      <div>
        <p className="text-label text-text-muted">{copy.market.forecast}</p>
        <h2>{text.title}</h2>
      </div>
      <button
        type="button"
        className="forecast-reset"
        aria-label={copy.market.resetCurve}
        title={copy.market.resetCurve}
        onClick={onReset}
      >
        <RotateCcw size={16} aria-hidden />
      </button>
    </header>
  );
}

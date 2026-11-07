import { useId } from "react";
import { copy } from "@/content/copy";
import { HERO_HIGH, HERO_LOW, MEAN_STEP, SIGMA_MAX, SIGMA_MIN, SIGMA_STEP } from "../lib/hero-grid";

type Props = {
  mean: number;
  sigma: number;
  onMean: (value: number) => void;
  onSigma: (value: number) => void;
};

export function ForecastControls({ mean, sigma, onMean, onSigma }: Props) {
  const id = useId();
  const controls = [
    {
      key: "mean",
      label: copy.market.mean,
      value: mean,
      onChange: onMean,
      min: HERO_LOW,
      max: HERO_HIGH,
      step: MEAN_STEP,
    },
    {
      key: "width",
      label: copy.market.width,
      value: sigma,
      onChange: onSigma,
      min: SIGMA_MIN,
      max: SIGMA_MAX,
      step: SIGMA_STEP,
    },
  ];
  return (
    <div className="forecast-controls">
      {controls.map(({ key, label, value, onChange, min, max, step }) => (
        <label key={key} htmlFor={`${id}-${key}`}>
          <span>
            {label}
            <output htmlFor={`${id}-${key}`}>
              {value.toFixed(1)} <small>{copy.landing.curve.unit}</small>
            </output>
          </span>
          <input
            id={`${id}-${key}`}
            aria-label={label}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
          />
        </label>
      ))}
    </div>
  );
}

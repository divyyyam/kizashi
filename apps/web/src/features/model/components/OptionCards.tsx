import { modelCopy } from "@/content/model-copy";
import { formatProbability, formatUsd } from "../lib/money";
import { formatOutcome, formatRatio } from "../lib/outcome-format";
import type { BetComparison, PricingInput } from "../lib/pricing";
import type { RunMarket } from "../types";
import { OptionCard } from "./OptionCard";

const text = modelCopy.options;

type OptionCardsProps = {
  readonly market: RunMarket;
  readonly input: PricingInput;
  readonly comparison: BetComparison;
};

function curveWhy(input: PricingInput, unit: string): string {
  const centre = formatOutcome(input.engine.mean);
  if (input.engine.sd >= input.crowd.sd) return text.curveWideWhy(centre, unit);
  return text.curveWhy(formatRatio(input.crowd.sd / input.engine.sd), centre, unit);
}

/** Binary and expressive side by side, the engine's pick badged, returns on one scale. */
export function OptionCards({ market, input, comparison }: OptionCardsProps) {
  const { binary, curve, pick } = comparison;
  const scale = Math.max(binary.expectedReturnUsd, curve.expectedReturnUsd, 0);
  const ratio = (value: number) => (scale > 0 ? Math.max(0, value) / scale : 0);
  const threshold = formatOutcome(input.threshold);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-small text-text-faint">{text.stake(formatUsd(input.stakeUsd))}</p>
      <OptionCard
        title={text.binary}
        isPick={pick === "binary"}
        facts={[
          {
            label: text.sideLabel,
            value: text.sideValue(text.side[binary.side], threshold, market.unit),
          },
          { label: text.price, value: formatProbability(binary.price) },
          { label: text.payoutIfRight, value: formatUsd(binary.payoutIfRightUsd) },
        ]}
        expectedReturnUsd={binary.expectedReturnUsd}
        barRatio={ratio(binary.expectedReturnUsd)}
        why={text.binaryWhy(
          formatProbability(binary.engineProbability),
          formatProbability(binary.price),
        )}
      />
      <OptionCard
        title={text.expressive}
        isPick={pick === "curve"}
        facts={[
          { label: text.centre, value: `${formatOutcome(curve.center)} ${market.unit}` },
          { label: text.width, value: text.widthValue(formatOutcome(curve.width), market.unit) },
          { label: text.peakPayout, value: formatUsd(curve.peakPayoutUsd) },
        ]}
        expectedReturnUsd={curve.expectedReturnUsd}
        barRatio={ratio(curve.expectedReturnUsd)}
        why={curveWhy(input, market.unit)}
      />
    </div>
  );
}

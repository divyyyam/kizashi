"use client";
import { freed, nettedCollateral, WAD } from "@kizashi/core";
import { RollingDigits } from "@/components/motion/RollingDigits";
import { copy } from "@/content/copy";
import { formatWad } from "@/lib/format";
import { ChapterHeading } from "./ChapterHeading";
import { useChapter } from "./use-chapter";

const GROSS = 10,
  MAX_HEDGE = 6,
  SLICES = 4;
const blocks = Array.from({ length: GROSS * SLICES }, (_, i) => ({
  col: Math.floor(i / SLICES),
  row: i % SLICES,
}));
function CollateralBlocks({ progress }: { progress: number }) {
  return (
    <svg className="net-plot" viewBox="0 0 480 178" aria-hidden="true">
      <path d="M16 146H468" className="stroke-border" />
      {blocks.map(({ col, row }) => {
        const x = 20 + col * 45,
          y = 134 - row * 14;
        const meet = Math.max(0, Math.min(1, progress * MAX_HEDGE - (GROSS - 1 - col)));
        return (
          <g key={col * SLICES + row}>
            <rect
              x={x}
              y={y}
              width={38}
              height={9}
              className="fill-text"
              opacity={0.82 * (1 - meet)}
            />
            {col >= GROSS - MAX_HEDGE && (
              <>
                <rect
                  x={x}
                  y={y - 64 * (1 - meet)}
                  width={38}
                  height={9}
                  className="fill-curve-user"
                  opacity={0.48 * (1 - meet)}
                />
                <rect
                  x={x}
                  y={y + 15 * meet}
                  width={38}
                  height={9}
                  className="fill-saved"
                  opacity={meet * 0.8}
                />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
export function NettingChapter() {
  const { ref, progress, setProgress } = useChapter(1.35);
  const units = (BigInt(Math.round(progress * MAX_HEDGE * SLICES)) * WAD) / BigInt(SLICES);
  const tickets = [
    [-BigInt(GROSS) * WAD, 0n],
    [units, 0n],
  ];
  return (
    <section id="netting" ref={ref} className="story-chapter netting-chapter">
      <ChapterHeading index={1} title={copy.story.netTitle} body={copy.story.netBody} />
      <div className="story-plate">
        <div className="plate-meta">
          <span>{copy.motion.example}</span>
          <span>{copy.story.unit}</span>
        </div>
        <div className="net-readouts">
          <div>
            <span>{copy.story.required}</span>
            <strong>
              <RollingDigits value={formatWad(nettedCollateral(tickets))} />
            </strong>
          </div>
          <div className="text-saved">
            <span>{copy.motion.saved}</span>
            <strong>
              <RollingDigits value={formatWad(freed(tickets))} />
            </strong>
          </div>
        </div>
        <CollateralBlocks progress={progress} />
        <div className="plate-controls">
          <label>
            {copy.story.netHelp}
            <input
              type="range"
              min={0}
              max={MAX_HEDGE}
              step={1 / SLICES}
              value={Number((units * 100n) / WAD) / 100}
              onChange={(e) => setProgress(Number(e.target.value) / MAX_HEDGE)}
            />
          </label>
        </div>
      </div>
    </section>
  );
}

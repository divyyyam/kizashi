import { formatWad } from "@/lib/format";
export function RequirementBar({
  label,
  value,
  gross,
}: {
  label: string;
  value: bigint;
  gross: bigint;
}) {
  const fraction = gross > 0n ? Number((value * 10000n) / gross) / 10000 : 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap justify-between gap-3 text-small">
        <span className="text-text-muted">{label}</span>
        <span className="tabular">{formatWad(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-sm bg-surface-raised" aria-hidden="true">
        <div
          className="requirement-fill h-full w-full origin-left bg-accent"
          style={{ transform: `scaleX(${fraction})` }}
        />
      </div>
    </div>
  );
}

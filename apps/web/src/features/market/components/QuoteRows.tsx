import { RollingDigits } from "@/components/motion/RollingDigits";
import { copy } from "@/content/copy";

export function QuoteRows({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <dl className="flex min-w-0 flex-col gap-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-wrap justify-between gap-2 text-small">
          <dt className="text-text-muted">{label}</dt>
          <dd
            className={label === copy.market.freed ? "text-saved" : "break-words tabular text-text"}
          >
            <RollingDigits value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

"use client";

import type { useQueryStates } from "nuqs";
import { Select, type SelectOption } from "@/components/ui/select";
import { copy } from "@/content/copy";
import type { filters } from "./MarketList";

export function MarketFilters({
  query,
  setQuery,
}: {
  query: ReturnType<typeof useQueryStates<typeof filters>>[0];
  setQuery: ReturnType<typeof useQueryStates<typeof filters>>[1];
}) {
  const kinds = ["all", "binary", "expressive"] as const;

  const statusOptions: readonly SelectOption<typeof query.status>[] = [
    { value: "all", label: copy.markets.allStatuses },
    { value: "open", label: copy.markets.open },
    { value: "resolved", label: copy.markets.resolved },
  ];

  const sortOptions: readonly SelectOption<typeof query.sort>[] = [
    { value: "closing", label: copy.markets.closingSoonest },
  ];

  return (
    <div className="market-filters flex flex-wrap items-end gap-4">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-small text-text-muted">{copy.markets.kind}</legend>
        <div className="market-kind">
          <span
            aria-hidden
            style={{ transform: `translateX(${kinds.indexOf(query.kind) * 100}%)` }}
          />
          {kinds.map((kind) => (
            <button
              type="button"
              key={kind}
              aria-pressed={query.kind === kind}
              onClick={() => void setQuery({ kind })}
            >
              {kind === "all" ? copy.markets.allKinds : copy.markets[kind]}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <span className="text-small text-text-muted">{copy.markets.status}</span>
        <Select
          ariaLabel={copy.markets.status}
          value={query.status}
          onValueChange={(status) => void setQuery({ status })}
          options={statusOptions}
        />
      </div>
      <div className="flex flex-col gap-2 md:ml-auto">
        <span className="text-small text-text-muted">{copy.markets.sort}</span>
        <Select
          ariaLabel={copy.markets.sort}
          value={query.sort}
          onValueChange={() => void setQuery({ sort: "closing" })}
          options={sortOptions}
        />
      </div>
    </div>
  );
}

import { LoadingRegion } from "@/components/feedback/LoadingRegion";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/content/copy";

export function MarketFiltersSkeleton() {
  return (
    <LoadingRegion
      label={copy.markets.loading}
      className="rounded-xl border border-border bg-surface p-4 md:p-5"
    >
      <div className="flex flex-wrap items-end gap-4" aria-hidden="true">
        {["kind", "status", "sort"].map((field) => (
          <div key={field} className={field === "sort" ? "space-y-2 md:ml-auto" : "space-y-2"}>
            <Skeleton className="h-5 w-16" />
            <Skeleton className={field === "kind" ? "h-10 w-64 max-w-full" : "h-10 w-40"} />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

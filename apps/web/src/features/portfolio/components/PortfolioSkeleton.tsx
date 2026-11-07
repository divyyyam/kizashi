import { LoadingRegion } from "@/components/feedback/LoadingRegion";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/content/copy";
import { CollateralMeterSkeleton } from "./CollateralMeterSkeleton";

export function PortfolioSkeleton() {
  return (
    <LoadingRegion label={copy.portfolio.loading} className="space-y-8">
      <CollateralMeterSkeleton />
      <div className="space-y-4" aria-hidden="true">
        <Skeleton className="h-6 w-28" />
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="hidden grid-cols-7 gap-4 border-b bg-surface px-6 py-4 xl:grid">
            {[0, 1, 2, 3, 4, 5, 6].map((column) => (
              <Skeleton key={column} className="h-5 w-3/4" />
            ))}
          </div>
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="grid gap-4 border-b border-border p-6 last:border-b-0 xl:grid-cols-7"
            >
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-14 w-full" />
              </div>
              {[0, 1, 2, 3, 4, 5].map((column) => (
                <div key={column} className="flex justify-between gap-4 xl:block">
                  <Skeleton className="h-5 w-24 xl:hidden" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

import { LoadingRegion } from "@/components/feedback/LoadingRegion";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/content/copy";

export function MarketsSkeleton() {
  return (
    <LoadingRegion
      label={copy.markets.loading}
      className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3"
    >
      {["first", "second", "third", "fourth", "fifth", "sixth"].map((slot) => (
        <div
          key={slot}
          className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface"
          aria-hidden="true"
        >
          <div className="space-y-4 p-5 pb-0">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="min-h-20 space-y-3">
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          </div>
          <div className="space-y-3 px-5 pt-6">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-36" />
          </div>
          <div className="px-5 pt-5">
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="mt-4 flex justify-between gap-8 border-t p-5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

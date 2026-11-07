import { LoadingRegion } from "@/components/feedback/LoadingRegion";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/content/copy";

export function MarketSkeleton() {
  return (
    <LoadingRegion label={copy.market.loading} className="space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-3/4" />
      </div>
      <div className="grid-page items-start">
        <div className="col-span-4 md:col-span-8 lg:col-span-7">
          <div className="rounded-xl border border-border bg-surface p-4 md:p-6">
            <Skeleton className="mb-8 h-5 w-32" />
            <Skeleton className="h-chart w-full lg:h-chart-desktop" />
            <div className="mt-6 flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
        <div className="hidden space-y-7 rounded-xl border border-border bg-surface p-6 lg:col-span-5 lg:block">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-11 w-full" />
          {[0, 1, 2].map((field) => (
            <div key={field} className="space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <div className="space-y-4 border-t border-border pt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {["details", "history"].map((section) => (
          <div
            key={section}
            className="space-y-5 rounded-xl border border-border bg-surface p-5 md:p-6"
          >
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface p-4 lg:hidden">
        <Skeleton className="h-11 w-full" />
      </div>
    </LoadingRegion>
  );
}

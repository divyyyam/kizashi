import { Skeleton } from "@/components/ui/skeleton";

export function CollateralMeterSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-6 md:p-8"
      aria-hidden="true"
    >
      <Skeleton className="h-6 w-48" />
      <div className="flex flex-col gap-4">
        <div className="space-y-3">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-l pl-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-3">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-full md:h-5" />
      <div className="flex justify-between gap-3 border-t border-border pt-6">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

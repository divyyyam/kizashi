import { LoadingRegion } from "@/components/feedback/LoadingRegion";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/content/copy";

export function ModelSkeleton() {
  return (
    <LoadingRegion
      label={copy.loading.page}
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-12 md:py-20"
    >
      <div className="flex flex-col items-center gap-5" aria-hidden="true">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-12 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-8 rounded-xl border border-border bg-surface p-6" aria-hidden="true">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-36 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="size-11 rounded-full" />
        </div>
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid gap-3 md:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((slot) => (
          <Skeleton key={slot} className="h-12 w-full" />
        ))}
      </div>
    </LoadingRegion>
  );
}

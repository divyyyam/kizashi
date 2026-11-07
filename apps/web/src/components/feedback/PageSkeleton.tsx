import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/content/copy";
import { LoadingRegion } from "./LoadingRegion";

export function PageSkeleton() {
  return (
    <LoadingRegion label={copy.loading.page} className="space-y-8">
      <div className="space-y-4" aria-hidden="true">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid gap-6 md:grid-cols-2" aria-hidden="true">
        {["primary", "secondary"].map((slot) => (
          <div key={slot} className="space-y-6 rounded-xl border border-border bg-surface p-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

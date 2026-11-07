import { LoadingRegion } from "@/components/feedback/LoadingRegion";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/content/copy";

export function CreateSkeleton() {
  return (
    <LoadingRegion
      label={copy.feedback.create.loading}
      className="grid min-w-0 grid-cols-1 items-start gap-8 lg:grid-cols-12"
    >
      <div
        className="space-y-8 rounded-xl border border-border bg-surface p-6 md:p-8 lg:col-span-8"
        aria-hidden="true"
      >
        <div className="flex gap-5 border-b border-border pb-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
        {[0, 1, 2].map((field) => (
          <div key={field} className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className={field === 1 ? "h-32 w-full" : "h-11 w-full"} />
          </div>
        ))}
        <Skeleton className="h-11 w-32" />
      </div>
      <div
        className="space-y-6 rounded-xl border border-border bg-surface p-6 lg:col-span-4"
        aria-hidden="true"
      >
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </LoadingRegion>
  );
}

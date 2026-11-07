import { useEffect, useState } from "react";
import { LoadingRegion } from "@/components/feedback/LoadingRegion";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import type { LocalQuote } from "../types";
import { QuoteDetails } from "./QuoteDetails";

export function QuoteBreakdown({ result }: { result: DataState<LocalQuote> }) {
  const [lastQuote, setLastQuote] = useState<LocalQuote>();
  useEffect(() => {
    if (result.status === "ready") setLastQuote(result.data);
  }, [result]);
  const quote =
    result.status === "ready" ? result.data : result.status === "loading" ? lastQuote : undefined;
  if (quote) return <QuoteDetails quote={quote} updating={result.status === "loading"} />;
  if (result.status === "loading")
    return (
      <LoadingRegion label={copy.market.quoting} className="space-y-4 border-t border-border pt-5">
        <div className="grid grid-cols-2 gap-4">
          {["cost", "payout"].map((row) => (
            <div key={row} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
            </div>
          ))}
        </div>
        {["probability", "details"].map((row) => (
          <div key={row} className="flex justify-between gap-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </LoadingRegion>
    );
  return (
    <p
      role={result.status === "error" ? "alert" : "status"}
      className="border-t border-border py-5 text-small text-text-muted"
    >
      {result.status === "error"
        ? result.message
        : result.status === "unavailable"
          ? result.reason
          : copy.market.enterSpend}
    </p>
  );
}

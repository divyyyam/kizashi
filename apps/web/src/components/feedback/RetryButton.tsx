"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";

export function RetryButton({
  retry,
  busy,
  retryAt,
}: {
  retry: () => void;
  busy?: boolean | undefined;
  retryAt?: number | undefined;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!retryAt) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (time >= retryAt) clearInterval(timer);
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, [retryAt]);
  const remaining = retryAt ? Math.max(0, Math.ceil((retryAt - (now ?? retryAt)) / 1000)) : 0;
  const cooling = Boolean(retryAt && (now === null || remaining > 0));
  return (
    <Button type="button" variant="secondary" size="sm" disabled={busy || cooling} onClick={retry}>
      <RefreshCw aria-hidden className={cn("size-4", busy && "motion-safe:animate-spin")} />
      {busy
        ? copy.feedback.refreshing
        : remaining > 0
          ? copy.feedback.retryIn(remaining)
          : copy.feedback.retry}
    </Button>
  );
}

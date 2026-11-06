import { cn } from "@/lib/cn";
import { appChain } from "@/lib/wagmi";

type NetworkBadgeProps = {
  readonly className?: string;
};

/** The chain this build is configured for. A label, not a live status: it never pulses. */
export function NetworkBadge({ className }: NetworkBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full border border-border px-3 text-small text-text-muted",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-signal" />
      {appChain.name}
    </span>
  );
}

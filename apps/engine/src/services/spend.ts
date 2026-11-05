import type { SpendEntry } from "@kizashi/schemas/engine";

const DAY_SECONDS = 24 * 60 * 60;

export function activeSpend(entries: SpendEntry[], nowSec: number) {
  return entries.filter(
    (entry) =>
      entry.atSec <= nowSec &&
      (entry.status === "sent" ||
        entry.status === "confirmed" ||
        (entry.status === "reserved" && entry.expiresAtSec > nowSec)),
  );
}

export function spendTotals(entries: SpendEntry[], nowSec: number) {
  const active = activeSpend(entries, nowSec);
  const sum = (items: SpendEntry[]) =>
    items.reduce((total, item) => total + BigInt(item.spendUsdc), 0n);
  return {
    totalUsdc: sum(active),
    pendingUsdc: sum(active.filter((entry) => entry.status !== "confirmed")),
    // Unresolved broadcasts retain their reservation even after the rolling window.
    dailyUsdc: sum(
      active.filter((entry) => entry.status !== "confirmed" || entry.atSec > nowSec - DAY_SECONDS),
    ),
    marketUsdc: (marketId: string) => sum(active.filter((entry) => entry.marketId === marketId)),
  };
}

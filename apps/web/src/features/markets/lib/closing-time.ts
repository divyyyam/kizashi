import { copy } from "@/content/copy";

const MINUTE_SEC = 60;
const HOUR_SEC = 60 * MINUTE_SEC;
const DAY_SEC = 24 * HOUR_SEC;
export function closingTime(closeTimeSec: number, nowSec: number): string {
  const remaining = closeTimeSec - nowSec;
  if (remaining <= 0) return copy.markets.ended;
  if (remaining >= DAY_SEC) return `${Math.floor(remaining / DAY_SEC)}${copy.markets.days}`;
  if (remaining >= HOUR_SEC) return `${Math.floor(remaining / HOUR_SEC)}${copy.markets.hours}`;
  if (remaining >= MINUTE_SEC)
    return `${Math.floor(remaining / MINUTE_SEC)}${copy.markets.minutes}`;
  return copy.markets.lessMinute;
}

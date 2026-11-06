import { modelCopy } from "@/content/model-copy";

const MINUTE_SEC = 60;
const HOUR_SEC = 3600;
const DAY_SEC = 86400;

/** "6 min", "3 h", "20 d": the largest whole unit left before a market closes. */
export function closeInLabel(closeTimeSec: number, nowSec: number): string {
  const left = Math.max(0, closeTimeSec - nowSec);
  if (left >= DAY_SEC) return modelCopy.time.days(Math.floor(left / DAY_SEC));
  if (left >= HOUR_SEC) return modelCopy.time.hours(Math.floor(left / HOUR_SEC));
  return modelCopy.time.minutes(Math.max(1, Math.floor(left / MINUTE_SEC)));
}

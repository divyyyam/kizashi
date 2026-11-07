const MONO_CHARACTER_WIDTH = 8;
const LABEL_GAP = 24;

/** Space labels in whole buckets; reserve both endpoints without a crowded final tick. */
export function axisTicks({
  count,
  width,
  labelCharacters,
}: {
  count: number;
  width: number;
  labelCharacters: number;
}): ReadonlySet<number> {
  const labelWidth = labelCharacters * MONO_CHARACTER_WIDTH + LABEL_GAP;
  const bucketGap = Math.max(1, Math.ceil(labelWidth / (width / count)));
  const intervals = Math.max(1, Math.min(width < 400 ? 2 : 6, Math.floor(count / bucketGap)));
  return new Set(
    Array.from({ length: intervals + 1 }, (_, i) => Math.round((i * count) / intervals)),
  );
}

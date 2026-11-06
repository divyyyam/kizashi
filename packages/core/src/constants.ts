/** 1 USDC = 10^18 WAD units = 10^6 USDC base units. */
export const WAD = 10n ** 18n;
export const USDC_TO_WAD = 10n ** 12n;
export const BUCKET_COUNT_MIN = 2;
export const BUCKET_COUNT_MAX = 64;
/** Safety margin (WAD units) on each directed side of exp and ln; matches Wad.MARGIN. */
export const EXP_LN_MARGIN = 2n;
/** Below this exp(x) < 1e-18 and the Solady port returns 0; matches Wad.EXP_MIN. */
export const EXP_MIN = -41_446_531_673_892_822_313n;

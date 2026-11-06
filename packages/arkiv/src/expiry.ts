import { ExpirationTime, type Expiry, MAX_LIFETIME } from "@arkiv-network/sdk";
import { ARKIV_BLOCK_TIME_SEC } from "./chain";

/**
 * Expiry rules (arkiv/schema.md). Arkiv expiry is a block height; the SDK converts seconds at a
 * nominal 2 s block time, so every value here is approximate by design. Arkiv emits no event when an
 * entity expires, so nothing in Kizashi ever writes an "expired" status: expiry *is* the signal.
 */

/** KizashiResolver.DISPUTE_WINDOW (contracts/src/resolution/KizashiResolver.sol). */
export const DISPUTE_WINDOW_SEC = 30 * 60;
/** Extra life after the dispute window so a resolved listing stays visible briefly. */
export const MARKET_GRACE_SEC = 60 * 60;
/** A listing written close to resolution still lives at least this long. */
export const MARKET_MIN_LIFETIME_SEC = 10 * 60;
export const CURVE_SNAPSHOT_LIFETIME_DAYS = 30;
export const PROPOSAL_LIFETIME_SEC = 10 * 60;
export const PROBE_LIFETIME_SEC = 10 * 60;
/** Longest lifetime the chain accepts, in seconds (MAX_LIFETIME blocks). */
export const MAX_LIFETIME_SEC = Number(MAX_LIFETIME) * ARKIV_BLOCK_TIME_SEC;

export class ExpiryRangeError extends Error {
  override readonly name = "ExpiryRangeError";
}

/** When a market listing should expire, in unix seconds. */
export function marketExpiresAtSec(resolvesAtSec: number): number {
  if (!Number.isSafeInteger(resolvesAtSec) || resolvesAtSec <= 0) {
    throw new ExpiryRangeError(`resolvesAtSec must be a positive integer, got ${resolvesAtSec}`);
  }
  return resolvesAtSec + DISPUTE_WINDOW_SEC + MARKET_GRACE_SEC;
}

/** SDK expiry for a market listing; refuses one the chain would reject as too long. */
export function marketExpiry(resolvesAtSec: number, nowSec: number): Expiry {
  const expiresAtSec = marketExpiresAtSec(resolvesAtSec);
  if (expiresAtSec - nowSec > MAX_LIFETIME_SEC) {
    throw new ExpiryRangeError(
      `listing would live ${expiresAtSec - nowSec}s, over the ${MAX_LIFETIME_SEC}s chain maximum`,
    );
  }
  return ExpirationTime.atDate(new Date(expiresAtSec * 1000), {
    atLeast: ExpirationTime.fromSeconds(MARKET_MIN_LIFETIME_SEC),
  });
}

export const curveSnapshotExpiry = (): Expiry =>
  ExpirationTime.fromDays(CURVE_SNAPSHOT_LIFETIME_DAYS);
export const proposalExpiry = (): Expiry => ExpirationTime.fromSeconds(PROPOSAL_LIFETIME_SEC);
export const probeExpiry = (): Expiry => ExpirationTime.fromSeconds(PROBE_LIFETIME_SEC);

// Pure plan-limit constants/formatters. Intentionally free of "server-only" so
// it can be imported by server code (lib/subscription.ts), client components,
// and plain tsx scripts (db/seed.ts, db/update-plans.ts) alike.

// Paid plans get unlimited auto-read bukti. We model "unlimited" as a large
// sentinel so the existing `used >= limit` checks (and the integer DB column)
// keep working without a migration — usage can never reach it.
export const UNLIMITED_PROOF_LIMIT = 1_000_000;

export function isUnlimitedProofs(limit: number) {
  return limit >= UNLIMITED_PROOF_LIMIT;
}

// Human-readable proof limit, e.g. "50" or "Unlimited".
export function formatProofLimit(limit: number) {
  return isUnlimitedProofs(limit) ? "Unlimited" : String(limit);
}

// Human-readable usage, e.g. "12/50" or "Unlimited" for unlimited plans.
export function formatProofUsage(used: number, limit: number) {
  return isUnlimitedProofs(limit) ? "Unlimited" : `${used}/${limit}`;
}

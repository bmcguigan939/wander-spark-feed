// Travidz commission — single source of truth (v6 model).
//
// Business-facing copy always shows the total commission only (11% of GBV).
// Stripe processing fees (2.9% + £0.20 per transaction) are deducted from
// that 11% off the top, leaving a NET POOL that is split between the
// creator and Travidz on every booking. The tier split applies to the
// net pool, not to the gross 11%:
//
//   founding       50 / 50  (first 5,000 creators — locked for first 24 months)
//   power          50 / 50  (rolling-12mo GBV ≥ £25k AND ≥1 published video
//                            in the last 30 days — 60-day grace before losing it)
//   new (0–6mo)    50 / 50
//   maturing (7–18mo)  40 / 60
//   mature (19+mo) 30 / 70
//
// resolveSplit() is a pure function — it stamps every redemption row so
// historical earnings stay correct even when the rules change later.
export const COMMISSION = {
  /** Gross commission charged to the business, as a percentage of GBV. */
  totalPct: 11,
  /** Stripe processing fee: 2.9% of GBV + £0.20 per transaction.
   *  Deducted from the gross commission before the creator/platform split. */
  stripeVariablePct: 2.9,
  stripeFixedCents: 20, // £0.20 per transaction
  // legacy aliases retained for any UI that still references a flat split.
  // (Net-pool roughly ~5.5% of GBV at typical AOV; 50/50 → ~2.75% each.)
  creatorPct: 5.5,
  platformPct: 5.5,
  powerTierGbvThresholdCents: 2_500_000, // £25,000
  foundingCap: 5000,
  /** Founding 50/50 is locked for this many months from creator_joined_at,
   *  then falls through to the standard tier ladder (or Power, if qualified). */
  foundingLockMonths: 24,
  /** Power Tier activity bar: at least this many published videos in the
   *  rolling 30-day window in addition to the £25k GBV threshold. */
  powerTierMinVideosPer30Days: 1,
  /** Days a Power Creator can stay below the bar before losing Power tier. */
  powerTierGraceDays: 60,
} as const;

export type CreatorTier = "founding" | "power" | "new" | "maturing" | "mature";

export type CreatorSplitInput = {
  joinedAt: Date | string | null;
  isFounding: boolean;
  powerTierLockedAt: Date | string | null;
  /** When the creator last met the Power Tier activity bar. If older than
   *  `powerTierGraceDays`, Power status is treated as expired. */
  powerTierLastQualifiedAt?: Date | string | null;
  bookingAt?: Date | string;
};

export type CreatorSplit = {
  tier: CreatorTier;
  creatorPct: number; // share of the net pool taken by the creator
  platformPct: number; // share of the net pool taken by Travidz
};

function monthsBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return ms / (1000 * 60 * 60 * 24 * 30.4375);
}

export function resolveSplit(input: CreatorSplitInput): CreatorSplit {
  const bookingAt = input.bookingAt ? new Date(input.bookingAt) : new Date();
  const joined = input.joinedAt ? new Date(input.joinedAt) : bookingAt;
  const tenureMonths = Math.max(0, monthsBetween(joined, bookingAt));

  // Founding 50/50 only holds for the first `foundingLockMonths` months.
  if (input.isFounding && tenureMonths < COMMISSION.foundingLockMonths) {
    return { tier: "founding", creatorPct: 50, platformPct: 50 };
  }

  // Power tier: still locked AND last-qualified within grace window
  // (if no qualifier timestamp is supplied, fall back to locked timestamp).
  if (input.powerTierLockedAt) {
    const qualifier = input.powerTierLastQualifiedAt ?? input.powerTierLockedAt;
    const ageDays = (bookingAt.getTime() - new Date(qualifier).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= COMMISSION.powerTierGraceDays) {
      return { tier: "power", creatorPct: 50, platformPct: 50 };
    }
  }

  if (tenureMonths < 6) return { tier: "new", creatorPct: 50, platformPct: 50 };
  if (tenureMonths < 18) return { tier: "maturing", creatorPct: 40, platformPct: 60 };
  return { tier: "mature", creatorPct: 30, platformPct: 70 };
}

/** Compute the Stripe processing fee on a single transaction, in cents. */
export function stripeFeeCents(gbvCents: number): number {
  if (gbvCents <= 0) return 0;
  return Math.round((gbvCents * COMMISSION.stripeVariablePct) / 100) + COMMISSION.stripeFixedCents;
}

/** Net commission pool after Stripe fees, used as the basis for the
 *  creator/platform tier split. Floors at 0 so micro-transactions where
 *  Stripe > 11% don't go negative. */
export function netCommissionPoolCents(gbvCents: number): number {
  const gross = Math.round((gbvCents * COMMISSION.totalPct) / 100);
  return Math.max(0, gross - stripeFeeCents(gbvCents));
}

/** Given the net pool in cents, split between creator and platform per tier. */
export function splitCommissionCents(
  totalCents: number,
  split: CreatorSplit,
): { creatorCents: number; platformCents: number } {
  const creatorCents = Math.round((totalCents * split.creatorPct) / 100);
  return { creatorCents, platformCents: Math.max(0, totalCents - creatorCents) };
}

export const TIER_LABEL: Record<CreatorTier, string> = {
  founding: "Founding Creator",
  power: "Power Creator",
  new: "New Creator",
  maturing: "Maturing Creator",
  mature: "Mature Creator",
};
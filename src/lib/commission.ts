// Travidz commission — single source of truth (v6 model).
//
// Business-facing copy always shows the total commission only (11% of GBV).
// Stripe processing fees (2.9% + £0.20 per transaction) are deducted from
// that 11% off the top, leaving a NET POOL that is split between the
// creator and Travidz on every booking. The tier split applies to the
// net pool, not to the gross 11%:
//
//   founding       50 / 50  (first 500 creators — locked for life)
//   power          50 / 50  (rolling-12mo GBV ≥ £25k — locked once crossed)
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
  foundingCap: 500,
} as const;

export type CreatorTier = "founding" | "power" | "new" | "maturing" | "mature";

export type CreatorSplitInput = {
  joinedAt: Date | string | null;
  isFounding: boolean;
  powerTierLockedAt: Date | string | null;
  bookingAt?: Date | string;
};

export type CreatorSplit = {
  tier: CreatorTier;
  creatorPct: number; // share of the 8% taken by the creator
  platformPct: number; // share of the 8% taken by Travidz
};

function monthsBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return ms / (1000 * 60 * 60 * 24 * 30.4375);
}

export function resolveSplit(input: CreatorSplitInput): CreatorSplit {
  const bookingAt = input.bookingAt ? new Date(input.bookingAt) : new Date();
  if (input.isFounding) return { tier: "founding", creatorPct: 50, platformPct: 50 };
  if (input.powerTierLockedAt) return { tier: "power", creatorPct: 50, platformPct: 50 };
  const joined = input.joinedAt ? new Date(input.joinedAt) : bookingAt;
  const tenureMonths = Math.max(0, monthsBetween(joined, bookingAt));
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
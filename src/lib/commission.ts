// Travidz commission constants — single source of truth.
// Business-facing copy shows totalPct only (5%).
// Internally that 5% is split 50/50 between the creator and the platform.
export const COMMISSION = {
  totalPct: 5,
  creatorPct: 2.5,
  platformPct: 2.5,
} as const;
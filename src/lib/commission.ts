// Travidz commission constants — single source of truth.
// Business-facing copy shows totalPct only (8%).
// Internally that 8% is split 50/50 between the creator and the platform.
export const COMMISSION = {
  totalPct: 8,
  creatorPct: 4,
  platformPct: 4,
} as const;
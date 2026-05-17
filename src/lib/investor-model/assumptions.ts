import type { CreatorTier } from "@/lib/commission";

export type TierMix = Record<CreatorTier, number>; // shares summing to ~1

export type Assumptions = {
  // Market sizing (annual, GBP)
  tamTravellers: number; // total addressable travellers/yr (UK + key EU)
  avgBookingValue: number; // £ per booking
  bookingsPerTraveller: number; // attach rate (avg bookings/yr/traveller)
  samPct: number; // % of TAM that is reachable via creator-led discovery
  somSharePctByYear: number[]; // Travidz share of SAM, year 1..5

  // Creator funnel
  creatorsActiveByYear: number[]; // active creators year 1..5
  gbvPerActiveCreator: number; // £/yr blended
  foundingCap: number; // 500
  powerThresholdGBP: number; // £25k rolling 12mo

  // Tier mix of creator-driven GBV by year (year 1..5)
  tierMixByYear: TierMix[];

  // Commission
  grossCommissionPct: number; // 8%
  // Creator share of the 8% by tier
  creatorSharePctByTier: Record<CreatorTier, number>; // 0.5, 0.5, 0.5, 0.4, 0.3
};

// v6 defaults — derived from the SOM/TAM workbook (base case)
export const V6_DEFAULTS: Assumptions = {
  tamTravellers: 85_000_000,
  avgBookingValue: 480,
  bookingsPerTraveller: 1.6,
  samPct: 0.28,
  somSharePctByYear: [0.0008, 0.0035, 0.0095, 0.018, 0.028],

  creatorsActiveByYear: [500, 2_400, 6_800, 14_000, 24_000],
  gbvPerActiveCreator: 18_500,
  foundingCap: 500,
  powerThresholdGBP: 25_000,

  // founding share decays as cohort dilutes; power tier grows as creators mature
  tierMixByYear: [
    { founding: 1.0, power: 0.0, mature: 0.0, maturing: 0.0, new: 0.0 },
    { founding: 0.45, power: 0.05, mature: 0.0, maturing: 0.15, new: 0.35 },
    { founding: 0.22, power: 0.18, mature: 0.1, maturing: 0.3, new: 0.2 },
    { founding: 0.12, power: 0.28, mature: 0.25, maturing: 0.25, new: 0.1 },
    { founding: 0.08, power: 0.34, mature: 0.32, maturing: 0.18, new: 0.08 },
  ],

  grossCommissionPct: 0.08,
  creatorSharePctByTier: {
    founding: 0.5,
    power: 0.5,
    new: 0.5,
    maturing: 0.4,
    mature: 0.3,
  },
};

export const TIER_ORDER: CreatorTier[] = ["founding", "power", "new", "maturing", "mature"];
export const TIER_COLORS: Record<CreatorTier, string> = {
  founding: "#3B82F6",
  power: "#22D3EE",
  new: "#A78BFA",
  maturing: "#F59E0B",
  mature: "#10B981",
};
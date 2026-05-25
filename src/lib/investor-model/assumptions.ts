import type { CreatorTier } from "@/lib/commission";

export type TierMix = Record<CreatorTier, number>; // shares summing to ~1

export type Assumptions = {
  // Market sizing (annual, GBP)
  // TAM is built UK-first; EU-5 (FR/DE/ES/IT/NL) is layered as an expansion multiplier.
  // Sources: ONS Travel Trends 2023, VisitBritain GB Tourist 2023, Eurostat 2023.
  tamTravellers: number; // UK leisure travellers/yr (outbound + domestic, blended)
  avgBookingValue: number; // £ per booking (blended UK leisure trip spend)
  bookingsPerTraveller: number; // attach rate (avg bookings/yr/traveller)
  eu5ExpansionMultiplier: number; // EU-5 TAM as a multiple of UK TAM (expansion layer)
  samPct: number; // creator-influenced share × bookable component
  somSharePctByYear: number[]; // ceiling-check: Travidz share of SAM, year 1..5

  // Creator funnel
  creatorsActiveByYear: number[]; // active creators year 1..5
  gbvPerActiveCreator: number; // £/yr blended
  foundingCap: number; // 500
  powerThresholdGBP: number; // £25k rolling 12mo

  // Tier mix of creator-driven GBV by year (year 1..5)
  tierMixByYear: TierMix[];

  // Commission
  grossCommissionPct: number; // 11% (v6)
  // Stripe shared off the top before tier split
  stripeVariablePct: number; // 2.9%
  stripeFixedPerTxn: number; // £0.20
  // Creator share of the NET pool (post-Stripe) by tier
  creatorSharePctByTier: Record<CreatorTier, number>; // 0.5, 0.5, 0.5, 0.4, 0.3

  // Infrastructure COGS (year 1..5, GBP). Mux is the dominant variable cost
  // — encoding once per upload, storage per minute/month, streaming per
  // minute viewed. Lovable Cloud + email scale with MAU.
  infraCosts: {
    muxEncodePerMin: number;        // £/min encoded
    muxStoragePerMinMonth: number;  // £/min stored per month
    muxStreamPerMin: number;        // £/min streamed
    avgVideoLengthMin: number;      // minutes per upload
    videosPerActiveCreatorPerYr: number;
    viewsPerVideoByYear: number[];  // ramps with audience
    avgStorageMonths: number;       // avg retention of a video, in months
    lovableCloudByYear: number[];   // £/yr — DB + auth + storage tier
    emailByYear: number[];          // £/yr — Resend / transactional email
  };
};

// Global market layer — matches the `regions` sheet of
// Travidz_Financial_Model_v2_Global.xlsx. Used to size the global TAM/SAM
// shown on /invest. UK Base remains the funded plan; global is optionality.
export type Region = {
  name: string;
  travellersM: number; // reachable leisure travellers (millions)
  abv: number; // blended £ per booking
};

export const GLOBAL_REGIONS: Region[] = [
  { name: "United Kingdom", travellersM: 25, abv: 480 },
  { name: "EU-5", travellersM: 150, abv: 460 },
  { name: "USA", travellersM: 180, abv: 540 },
  { name: "Australia / NZ", travellersM: 18, abv: 580 },
  { name: "LATAM", travellersM: 110, abv: 280 },
  { name: "MENA", travellersM: 70, abv: 380 },
  { name: "Africa", travellersM: 90, abv: 220 },
  { name: "India", travellersM: 140, abv: 200 },
  { name: "SEA", travellersM: 160, abv: 240 },
  { name: "Greater China", travellersM: 280, abv: 420 },
];

export const GLOBAL_MARKET = {
  bookingsPerTraveller: 1.5, // matches Global Viral column in the workbook
  samPct: 0.26, // creator-influenced × bookable, global blend
  // Y5 SOM anchors (from workbook)
  somGBVBaseY5: 350_000_000, // UK Base Y5 GBV
  somNetBaseY5: 16_290_000, // UK Base Y5 Travidz net (v6: 11% − Stripe shared − tiered split)
  somGBVGlobalY5: 1_322_400_000, // Global Viral Y5 GBV
  somNetGlobalY5: 61_900_000, // Global Viral Y5 Travidz net (v6)
} as const;

// v6 financial-model / v10 market-workbook defaults — UK-first.
// UK TAM: 60.7M outbound × £870 + 118M domestic × £295 = £87.6B
// SAM = 36% creator-influenced × 80% bookable = 28.8% of TAM.
// Commission: 11% gross; Stripe 2.9% + £0.20/txn shared off the top;
// remaining net pool split per tier (50/50/50/40/30).
export const V6_DEFAULTS: Assumptions = {
  tamTravellers: 178_700_000, // 60.7M outbound + 118M domestic UK leisure trips
  avgBookingValue: 490, // blended £/trip → ≈ £87.6B UK TAM
  bookingsPerTraveller: 1.0,
  eu5ExpansionMultiplier: 2.91, // EU-5 adds ~£255B on top of UK £87.6B
  samPct: 0.288, // 36% creator-influenced × 80% bookable
  somSharePctByYear: [0.0004, 0.0018, 0.005, 0.0103, 0.0176], // implied % of UK SAM (sanity check)

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

  grossCommissionPct: 0.11,
  stripeVariablePct: 0.029,
  stripeFixedPerTxn: 0.20,
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
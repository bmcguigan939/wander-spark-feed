import type { CreatorTier } from "@/lib/commission";
import type { Assumptions, TierMix } from "./assumptions";
import { TIER_ORDER, GLOBAL_REGIONS, GLOBAL_MARKET } from "./assumptions";

export type MarketSizing = {
  tamGBV: number; // UK-only TAM
  tamGBVAll: number; // UK + EU-5
  samGBV: number; // UK-only SAM
  samGBVAll: number; // UK + EU-5 SAM
  somGBVByYear: number[]; // top-down ceiling check: % of UK SAM
  somBottomUpGBVByYear: number[]; // bottom-up SOM from creator funnel (matches financial model)
  // Global layer — sums every region in GLOBAL_REGIONS at the global attach rate.
  tamGBVGlobal: number;
  samGBVGlobal: number;
  globalTravellersM: number;
  blendedGlobalABV: number;
  somGBVBaseY5: number; // UK Base Y5 GBV (funded plan)
  somNetBaseY5: number;
  somGBVGlobalY5: number; // Global Viral Y5 GBV
  somNetGlobalY5: number;
};

export function computeMarket(a: Assumptions): MarketSizing {
  const tamGBV = a.tamTravellers * a.bookingsPerTraveller * a.avgBookingValue;
  const tamGBVAll = tamGBV * (1 + a.eu5ExpansionMultiplier);
  const samGBV = tamGBV * a.samPct;
  const samGBVAll = tamGBVAll * a.samPct;
  const somGBVByYear = a.somSharePctByYear.map((p) => samGBV * p);
  const somBottomUpGBVByYear = a.creatorsActiveByYear.map((c) => c * a.gbvPerActiveCreator);

  // Global TAM/SAM — region-by-region build (matches workbook's `regions` sheet).
  const globalTravellersM = GLOBAL_REGIONS.reduce((s, r) => s + r.travellersM, 0);
  const tamGBVGlobal = GLOBAL_REGIONS.reduce(
    (s, r) => s + r.travellersM * 1_000_000 * GLOBAL_MARKET.bookingsPerTraveller * r.abv,
    0,
  );
  const samGBVGlobal = tamGBVGlobal * GLOBAL_MARKET.samPct;
  const blendedGlobalABV = tamGBVGlobal / (globalTravellersM * 1_000_000 * GLOBAL_MARKET.bookingsPerTraveller);

  return {
    tamGBV,
    tamGBVAll,
    samGBV,
    samGBVAll,
    somGBVByYear,
    somBottomUpGBVByYear,
    tamGBVGlobal,
    samGBVGlobal,
    globalTravellersM,
    blendedGlobalABV,
    somGBVBaseY5: GLOBAL_MARKET.somGBVBaseY5,
    somNetBaseY5: GLOBAL_MARKET.somNetBaseY5,
    somGBVGlobalY5: GLOBAL_MARKET.somGBVGlobalY5,
    somNetGlobalY5: GLOBAL_MARKET.somNetGlobalY5,
  };
}

export type CreatorYear = {
  year: number;
  activeCreators: number;
  tierMix: TierMix;
  creatorsByTier: Record<CreatorTier, number>;
};

export function computeCreatorCohorts(a: Assumptions): CreatorYear[] {
  return a.creatorsActiveByYear.map((n, i) => {
    const mix = a.tierMixByYear[i];
    const creatorsByTier = Object.fromEntries(
      TIER_ORDER.map((t) => [t, Math.round(n * (mix[t] ?? 0))]),
    ) as Record<CreatorTier, number>;
    return { year: i + 1, activeCreators: n, tierMix: mix, creatorsByTier };
  });
}

export type RevenueYear = {
  year: number;
  gbv: number;
  gbvByTier: Record<CreatorTier, number>;
  grossCommission: number;
  stripeFee: number;
  netPool: number; // grossCommission − stripeFee (shared off the top)
  creatorPayout: number;
  travidzNet: number;
  blendedCreatorSharePct: number; // of the net pool (post-Stripe)
  blendedTakeRatePct: number; // travidzNet / gbv
};

export function computeRevenue(a: Assumptions): RevenueYear[] {
  const market = computeMarket(a);
  return a.creatorsActiveByYear.map((creators, i) => {
    const year = i + 1;
    // GBV is bottom-up from creator funnel (matches financial model).
    // SAM ceiling is shown separately in MarketPane as a sanity check.
    void market;
    const gbv = creators * a.gbvPerActiveCreator;
    const mix = a.tierMixByYear[i];
    const gbvByTier = Object.fromEntries(
      TIER_ORDER.map((t) => [t, gbv * (mix[t] ?? 0)]),
    ) as Record<CreatorTier, number>;

    const grossCommission = gbv * a.grossCommissionPct;
    const txnCount = a.avgBookingValue > 0 ? gbv / a.avgBookingValue : 0;
    const stripeFee = gbv * a.stripeVariablePct + txnCount * a.stripeFixedPerTxn;
    const netPool = Math.max(0, grossCommission - stripeFee);
    // Tier split applies to the NET pool (after shared Stripe), weighted by tier-GBV share.
    let creatorPayout = 0;
    for (const t of TIER_ORDER) {
      const tierShareOfGbv = gbv > 0 ? gbvByTier[t] / gbv : 0;
      creatorPayout += netPool * tierShareOfGbv * a.creatorSharePctByTier[t];
    }
    const travidzNet = netPool - creatorPayout;
    const blendedCreatorSharePct = netPool > 0 ? creatorPayout / netPool : 0;
    const blendedTakeRatePct = gbv > 0 ? travidzNet / gbv : 0;
    return {
      year,
      gbv,
      gbvByTier,
      grossCommission,
      stripeFee,
      netPool,
      creatorPayout,
      travidzNet,
      blendedCreatorSharePct,
      blendedTakeRatePct,
    };
  });
}

export function fmtGBP(n: number, opts: { compact?: boolean } = {}) {
  const v = Math.round(n);
  if (opts.compact) {
    const abs = Math.abs(v);
    if (abs >= 1_000_000_000) return `£${(v / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `£${(v / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `£${(v / 1_000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);
}

export function fmtPct(n: number, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtNum(n: number) {
  return new Intl.NumberFormat("en-GB").format(Math.round(n));
}
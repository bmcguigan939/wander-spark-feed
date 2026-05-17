import type { CreatorTier } from "@/lib/commission";
import type { Assumptions, TierMix } from "./assumptions";
import { TIER_ORDER } from "./assumptions";

export type MarketSizing = {
  tamGBV: number; // UK-only TAM
  tamGBVAll: number; // UK + EU-5
  samGBV: number; // UK-only SAM
  samGBVAll: number; // UK + EU-5 SAM
  somGBVByYear: number[]; // top-down ceiling check: % of UK SAM
  somBottomUpGBVByYear: number[]; // bottom-up SOM from creator funnel (matches financial model)
};

export function computeMarket(a: Assumptions): MarketSizing {
  const tamGBV = a.tamTravellers * a.bookingsPerTraveller * a.avgBookingValue;
  const tamGBVAll = tamGBV * (1 + a.eu5ExpansionMultiplier);
  const samGBV = tamGBV * a.samPct;
  const samGBVAll = tamGBVAll * a.samPct;
  const somGBVByYear = a.somSharePctByYear.map((p) => samGBV * p);
  const somBottomUpGBVByYear = a.creatorsActiveByYear.map((c) => c * a.gbvPerActiveCreator);
  return { tamGBV, tamGBVAll, samGBV, samGBVAll, somGBVByYear, somBottomUpGBVByYear };
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
  creatorPayout: number;
  travidzNet: number;
  blendedCreatorSharePct: number; // of the 8%
  blendedTakeRatePct: number; // travidzNet / gbv
};

export function computeRevenue(a: Assumptions): RevenueYear[] {
  const market = computeMarket(a);
  return a.creatorsActiveByYear.map((creators, i) => {
    const year = i + 1;
    // GBV = lesser of (creator-driven capacity, SOM) — keep both visible by using min
    const creatorDrivenGBV = creators * a.gbvPerActiveCreator;
    const gbv = Math.min(creatorDrivenGBV, market.somGBVByYear[i]);
    const mix = a.tierMixByYear[i];
    const gbvByTier = Object.fromEntries(
      TIER_ORDER.map((t) => [t, gbv * (mix[t] ?? 0)]),
    ) as Record<CreatorTier, number>;

    const grossCommission = gbv * a.grossCommissionPct;
    let creatorPayout = 0;
    for (const t of TIER_ORDER) {
      creatorPayout += gbvByTier[t] * a.grossCommissionPct * a.creatorSharePctByTier[t];
    }
    const travidzNet = grossCommission - creatorPayout;
    const blendedCreatorSharePct = grossCommission > 0 ? creatorPayout / grossCommission : 0;
    const blendedTakeRatePct = gbv > 0 ? travidzNet / gbv : 0;
    return {
      year,
      gbv,
      gbvByTier,
      grossCommission,
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
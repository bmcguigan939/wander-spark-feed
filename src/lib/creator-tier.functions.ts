import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { COMMISSION, resolveSplit, TIER_LABEL, type CreatorTier } from "@/lib/commission";

export type CreatorTierInfo = {
  tier: CreatorTier;
  tierLabel: string;
  creatorPct: number;
  platformPct: number;
  isFounding: boolean;
  foundingNumber: number | null;
  powerTierLockedAt: string | null;
  joinedAt: string | null;
  rolling12moGbvCents: number;
  powerThresholdCents: number;
  /** £ remaining (in cents) to reach the £25k power-tier lock. 0 once unlocked. */
  centsToPowerTier: number;
  foundingSpotsRemaining: number;
};

export const getMyCreatorTier = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreatorTierInfo> => {
    const { userId } = context;
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select(
        "is_founding_creator,founding_creator_number,creator_joined_at,power_tier_locked_at,rolling_12mo_gbv_cents",
      )
      .eq("id", userId)
      .maybeSingle();

    const split = resolveSplit({
      joinedAt: p?.creator_joined_at ?? null,
      isFounding: !!p?.is_founding_creator,
      powerTierLockedAt: p?.power_tier_locked_at ?? null,
    });

    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("founding_creator_number", "is", null);
    const foundingSpotsRemaining = Math.max(0, COMMISSION.foundingCap - (count ?? 0));

    const gbv = Number(p?.rolling_12mo_gbv_cents ?? 0);
    return {
      tier: split.tier,
      tierLabel: TIER_LABEL[split.tier],
      creatorPct: split.creatorPct,
      platformPct: split.platformPct,
      isFounding: !!p?.is_founding_creator,
      foundingNumber: p?.founding_creator_number ?? null,
      powerTierLockedAt: p?.power_tier_locked_at ?? null,
      joinedAt: p?.creator_joined_at ?? null,
      rolling12moGbvCents: gbv,
      powerThresholdCents: COMMISSION.powerTierGbvThresholdCents,
      centsToPowerTier: p?.power_tier_locked_at
        ? 0
        : Math.max(0, COMMISSION.powerTierGbvThresholdCents - gbv),
      foundingSpotsRemaining,
    };
  });

/** Public, anonymous count for marketing surfaces ("Only X Founding spots left"). */
export const getFoundingSpotsRemaining = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ remaining: number; cap: number }> => {
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("founding_creator_number", "is", null);
    return {
      remaining: Math.max(0, COMMISSION.foundingCap - (count ?? 0)),
      cap: COMMISSION.foundingCap,
    };
  });
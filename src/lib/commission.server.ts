import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  COMMISSION,
  resolveSplit,
  splitCommissionCents,
  type CreatorSplit,
} from "./commission";

type CreatorTierRow = {
  id: string;
  is_founding_creator: boolean;
  founding_creator_number: number | null;
  creator_joined_at: string | null;
  power_tier_locked_at: string | null;
  rolling_12mo_gbv_cents: number | null;
};

export async function loadCreatorSplit(
  creatorId: string | null | undefined,
  bookingAt?: Date,
): Promise<CreatorSplit> {
  if (!creatorId) {
    return { tier: "new", creatorPct: 50, platformPct: 50 };
  }
  const { data } = await supabaseAdmin
    .from("profiles")
    .select(
      "id,is_founding_creator,founding_creator_number,creator_joined_at,power_tier_locked_at,rolling_12mo_gbv_cents",
    )
    .eq("id", creatorId)
    .maybeSingle<CreatorTierRow>();
  if (!data) return { tier: "new", creatorPct: 50, platformPct: 50 };
  return resolveSplit({
    joinedAt: data.creator_joined_at,
    isFounding: !!data.is_founding_creator,
    powerTierLockedAt: data.power_tier_locked_at,
    bookingAt,
  });
}

/** Compute and persist the split snapshot on a redemption row.
 *  Idempotent — safe to call multiple times.
 *  Uses `order_value_cents` × `commission_rate` (or 8% fallback) for the total,
 *  then splits per the creator's current tier. */
export async function stampRedemptionSplit(redemptionId: string): Promise<void> {
  const { data: r } = await supabaseAdmin
    .from("deal_redemptions")
    .select(
      "id,creator_id,order_value_cents,commission_cents,commission_rate,created_at,confirmed_at",
    )
    .eq("id", redemptionId)
    .maybeSingle();
  if (!r) return;
  const split = await loadCreatorSplit(
    r.creator_id,
    new Date(r.confirmed_at ?? r.created_at ?? Date.now()),
  );

  const totalCents =
    r.commission_cents ??
    Math.round(
      (r.order_value_cents ?? 0) *
        ((r.commission_rate ?? COMMISSION.totalPct) / 100),
    );
  const { creatorCents, platformCents } = splitCommissionCents(totalCents, split);

  await supabaseAdmin
    .from("deal_redemptions")
    .update({
      creator_share_pct: split.creatorPct,
      platform_share_pct: split.platformPct,
      creator_tier: split.tier,
      creator_commission_cents: creatorCents,
      platform_commission_cents: platformCents,
    })
    .eq("id", redemptionId);
}
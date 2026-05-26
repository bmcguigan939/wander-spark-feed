import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  COMMISSION,
  netCommissionPoolCents,
  resolveSplit,
  splitCommissionCents,
  stripeFeeCents,
  type CreatorSplit,
} from "./commission";
import {
  enqueueTransactionalEmail,
  formatMoneyGBP,
  getUserEmail,
  SITE_URL,
} from "./email-send.server";
import { CreatorTierUnlockedEmail } from "./email-templates/creator-tier-unlocked";

type CreatorTierRow = {
  id: string;
  is_founding_creator: boolean;
  founding_creator_number: number | null;
  creator_joined_at: string | null;
  power_tier_locked_at: string | null;
  power_tier_last_qualified_at: string | null;
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
      "id,is_founding_creator,founding_creator_number,creator_joined_at,power_tier_locked_at,power_tier_last_qualified_at,rolling_12mo_gbv_cents",
    )
    .eq("id", creatorId)
    .maybeSingle<CreatorTierRow>();
  if (!data) return { tier: "new", creatorPct: 50, platformPct: 50 };
  return resolveSplit({
    joinedAt: data.creator_joined_at,
    isFounding: !!data.is_founding_creator,
    powerTierLockedAt: data.power_tier_locked_at,
    powerTierLastQualifiedAt: (data as any).power_tier_last_qualified_at,
    bookingAt,
  });
}

/** Compute and persist the split snapshot on a redemption row.
 *  Idempotent — safe to call multiple times.
 *  Computes the gross commission (`order_value_cents` × `commission_rate`,
 *  defaulting to the current 11%), subtracts the Stripe processing fee to
 *  derive the net pool, then splits the net pool per the creator's tier. */
export async function stampRedemptionSplit(redemptionId: string): Promise<void> {
  const { data: r } = await supabaseAdmin
    .from("deal_redemptions")
    .select(
      "id,creator_id,deal_id,order_value_cents,commission_cents,commission_rate,created_at,confirmed_at",
    )
    .eq("id", redemptionId)
    .maybeSingle();
  if (!r) return;
  const split = await loadCreatorSplit(
    r.creator_id,
    new Date(r.confirmed_at ?? r.created_at ?? Date.now()),
  );

  const gbvCents = r.order_value_cents ?? 0;

  // For activity operators on the operator_markup model, the commission
  // pool IS the uplift (price_cents − operator_base_price_cents), not
  // 11% of GBV. This keeps the operator's net equal to their own website
  // price and ensures Travidz only takes what was added on top.
  let netPoolCents: number;
  if (r.deal_id) {
    const { data: deal } = await supabaseAdmin
      .from("deals")
      .select("pricing_model,operator_base_price_cents,price_cents")
      .eq("id", r.deal_id)
      .maybeSingle();
    if (
      deal &&
      (deal as any).pricing_model === "operator_markup" &&
      (deal as any).operator_base_price_cents != null
    ) {
      const uplift = Math.max(
        0,
        ((deal as any).price_cents ?? gbvCents) -
          (deal as any).operator_base_price_cents,
      );
      // Subtract Stripe fee (computed on full GBV the customer paid)
      netPoolCents = Math.max(0, uplift - stripeFeeCents(gbvCents));
    } else {
      netPoolCents = netCommissionPoolCents(gbvCents);
    }
  } else {
    netPoolCents = netCommissionPoolCents(gbvCents);
  }
  const { creatorCents, platformCents } = splitCommissionCents(netPoolCents, split);

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

  // Opportunistic power-tier check: if this creator just crossed £25k
  // rolling-12mo GBV, lock them at 50% forever and notify.
  if (r.creator_id) {
    await maybeLockPowerTier(r.creator_id).catch((e) =>
      console.error("power-tier check failed", e),
    );
  }
}

async function maybeLockPowerTier(creatorId: string): Promise<void> {
  const { data: p } = await supabaseAdmin
    .from("profiles")
    .select("id,display_name,username,power_tier_locked_at")
    .eq("id", creatorId)
    .maybeSingle();
  if (!p || p.power_tier_locked_at) return;

  const since = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
  const { data: rows } = await supabaseAdmin
    .from("deal_redemptions")
    .select("order_value_cents")
    .eq("creator_id", creatorId)
    .eq("status", "confirmed")
    .gte("confirmed_at", since);
  const gbv = (rows ?? []).reduce(
    (acc, r: any) => acc + (r.order_value_cents ?? 0),
    0,
  );
  await supabaseAdmin
    .from("profiles")
    .update({
      rolling_12mo_gbv_cents: gbv,
      rolling_12mo_gbv_refreshed_at: new Date().toISOString(),
    })
    .eq("id", creatorId);
  if (gbv < COMMISSION.powerTierGbvThresholdCents) return;

  const { data: locked } = await supabaseAdmin
    .from("profiles")
    .update({ power_tier_locked_at: new Date().toISOString() })
    .eq("id", creatorId)
    .is("power_tier_locked_at", null)
    .select("id")
    .maybeSingle();
  if (!locked) return;

  const email = await getUserEmail(creatorId);
  if (!email) return;
  await enqueueTransactionalEmail({
    to: email,
    subject: "You unlocked Power Creator — 50% for life",
    label: "creator_tier_unlocked",
    userId: creatorId,
    category: "redemption",
    idempotencyKey: `creator-tier-unlocked-${creatorId}`,
    react: CreatorTierUnlockedEmail({
      creatorName:
        (p as any).display_name || `@${(p as any).username ?? "there"}`,
      rolling12moFormatted: formatMoneyGBP(gbv),
      earningsUrl: `${SITE_URL}/creator/earnings`,
    }),
  });
}
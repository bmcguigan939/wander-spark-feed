import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { COMMISSION, resolveSplit, TIER_LABEL, type CreatorTier } from "@/lib/commission";
import {
  enqueueTransactionalEmail,
  getUserEmail,
  SITE_URL,
} from "@/lib/email-send.server";
import { FoundingCreatorWelcomeEmail } from "@/lib/email-templates/founding-creator-welcome";

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
  /** Number of published videos in the rolling 30-day window. */
  videosLast30d: number;
  /** Activity bar required to keep Power Tier (also used pre-lock for messaging). */
  videosRequiredPer30d: number;
  /** Date Power Tier expires if creator doesn't re-qualify (null = not on grace). */
  gracePeriodEndsAt: string | null;
  /** True if founding lock has expired (24mo passed). */
  foundingLockExpired: boolean;
  /** Date the founding lock expires for this creator (24mo from join). */
  foundingLockEndsAt: string | null;
};

export const getMyCreatorTier = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreatorTierInfo> => {
    const { userId } = context;
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select(
        "is_founding_creator,founding_creator_number,creator_joined_at,power_tier_locked_at,power_tier_last_qualified_at,rolling_12mo_gbv_cents",
      )
      .eq("id", userId)
      .maybeSingle();

    const split = resolveSplit({
      joinedAt: p?.creator_joined_at ?? null,
      isFounding: !!p?.is_founding_creator,
      powerTierLockedAt: p?.power_tier_locked_at ?? null,
      powerTierLastQualifiedAt: (p as any)?.power_tier_last_qualified_at ?? null,
    });

    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("founding_creator_number", "is", null);
    const foundingSpotsRemaining = Math.max(0, COMMISSION.foundingCap - (count ?? 0));

    // Count published videos in the last 30 days.
    const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { count: vidCount } = await supabaseAdmin
      .from("videos")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", userId)
      .eq("status", "ready")
      .eq("is_hidden", false)
      .eq("is_draft", false)
      .gte("created_at", since30);

    const lastQual = (p as any)?.power_tier_last_qualified_at as string | null;
    const gracePeriodEndsAt =
      p?.power_tier_locked_at && lastQual
        ? new Date(new Date(lastQual).getTime() + COMMISSION.powerTierGraceDays * 24 * 3600 * 1000).toISOString()
        : null;

    const joinedAt = p?.creator_joined_at ?? null;
    const foundingLockEndsAt = joinedAt
      ? new Date(new Date(joinedAt).getTime() + COMMISSION.foundingLockMonths * 30.4375 * 24 * 3600 * 1000).toISOString()
      : null;
    const foundingLockExpired = !!(
      p?.is_founding_creator &&
      foundingLockEndsAt &&
      new Date(foundingLockEndsAt).getTime() < Date.now()
    );

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
      videosLast30d: vidCount ?? 0,
      videosRequiredPer30d: COMMISSION.powerTierMinVideosPer30Days,
      gracePeriodEndsAt,
      foundingLockExpired,
      foundingLockEndsAt,
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

/** Called by the welcome flow right after a user picks the "creator" role.
 *  Sends the Founding Creator welcome email if the trigger assigned them a
 *  founding number. Idempotent via Resend idempotency key. */
export const sendFoundingWelcomeIfEligible = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ sent: boolean; foundingNumber: number | null }> => {
    const { userId } = context;
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("display_name,username,is_founding_creator,founding_creator_number")
      .eq("id", userId)
      .maybeSingle();
    if (!p?.is_founding_creator || !p.founding_creator_number) {
      return { sent: false, foundingNumber: null };
    }
    const email = await getUserEmail(userId);
    if (!email) return { sent: false, foundingNumber: p.founding_creator_number };
    await enqueueTransactionalEmail({
      to: email,
      subject: `You're Founding Creator #${p.founding_creator_number} — 50% for life`,
      label: "founding_creator_welcome",
      userId,
      category: "redemption",
      idempotencyKey: `founding-creator-welcome-${userId}`,
      react: FoundingCreatorWelcomeEmail({
        creatorName: p.display_name || `@${p.username ?? "there"}`,
        foundingNumber: p.founding_creator_number,
        studioUrl: `${SITE_URL}/studio`,
      }),
    });
    return { sent: true, foundingNumber: p.founding_creator_number };
  });
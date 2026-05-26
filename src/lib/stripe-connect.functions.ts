import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";

const SITE_URL =
  process.env.SITE_URL ||
  process.env.VITE_SITE_URL ||
  "https://travidz.com";

const envSchema = z.object({ environment: z.enum(["sandbox", "live"]) });

type ConnectStatusRow = {
  stripe_connect_account_id: string | null;
  stripe_connect_status: string;
  stripe_connect_charges_enabled: boolean;
  stripe_connect_payouts_enabled: boolean;
  stripe_connect_requirements: any;
  stripe_connect_country: string | null;
  stripe_connect_default_currency: string | null;
  stripe_connect_updated_at: string | null;
};

function deriveStatus(acct: any): {
  status: "pending" | "active" | "restricted" | "rejected";
  charges: boolean;
  payouts: boolean;
} {
  const charges = !!acct.charges_enabled;
  const payouts = !!acct.payouts_enabled;
  const disabledReason = acct.requirements?.disabled_reason as string | null;
  if (disabledReason?.startsWith("rejected")) {
    return { status: "rejected", charges, payouts };
  }
  if (charges && payouts) return { status: "active", charges, payouts };
  if (disabledReason) return { status: "restricted", charges, payouts };
  return { status: "pending", charges, payouts };
}

async function persistAccount(userId: string, acct: any) {
  const derived = deriveStatus(acct);
  await supabaseAdmin
    .from("profiles")
    .update({
      stripe_connect_account_id: acct.id,
      stripe_connect_status: derived.status,
      stripe_connect_charges_enabled: derived.charges,
      stripe_connect_payouts_enabled: derived.payouts,
      stripe_connect_requirements: acct.requirements ?? null,
      stripe_connect_country: acct.country ?? null,
      stripe_connect_default_currency: acct.default_currency ?? null,
      stripe_connect_updated_at: new Date().toISOString(),
      // Keep payout_method in sync so older code paths still gate correctly.
      ...(derived.payouts ? { payout_method: "stripe_connect" } : {}),
    })
    .eq("id", userId);
}

/** Read the current Connect status for the signed-in business. */
export const getMyConnectStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("profiles")
      .select(
        "stripe_connect_account_id,stripe_connect_status,stripe_connect_charges_enabled,stripe_connect_payouts_enabled,stripe_connect_requirements,stripe_connect_country,stripe_connect_default_currency,stripe_connect_updated_at",
      )
      .eq("id", userId)
      .maybeSingle<ConnectStatusRow>();
    return data ?? null;
  });

/** Create (if needed) a Connect Express account and return a hosted onboarding URL. */
export const startConnectOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    envSchema
      .extend({
        country: z.string().length(2).toUpperCase().default("GB"),
        returnPath: z.string().startsWith("/").default("/business/onboarding/payout"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const stripe = createStripeClient(data.environment as StripeEnv);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_account_id,business_name,business_website_url,business_country")
      .eq("id", userId)
      .maybeSingle();

    const { data: authUser } = await supabase.auth.getUser();
    const email = authUser?.user?.email ?? undefined;

    let accountId = profile?.stripe_connect_account_id ?? null;
    if (!accountId) {
      const acct = await stripe.accounts.create({
        type: "express",
        country: (profile?.business_country || data.country).toUpperCase(),
        ...(email ? { email } : {}),
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "company",
        business_profile: {
          name: profile?.business_name ?? undefined,
          url: profile?.business_website_url ?? undefined,
          product_description:
            "Travel experiences (hotel stays, tours, activities) sold via Travidz.",
        },
        metadata: { travidz_user_id: userId },
      });
      accountId = acct.id;
      await persistAccount(userId, acct);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${SITE_URL}${data.returnPath}?connect=refresh`,
      return_url: `${SITE_URL}${data.returnPath}?connect=done`,
    });

    return { url: link.url, accountId };
  });

/** Pull the latest status from Stripe and persist. Call after returning from onboarding. */
export const refreshConnectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => envSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.stripe_connect_account_id) {
      return { status: "none" as const };
    }
    const stripe = createStripeClient(data.environment as StripeEnv);
    const acct = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
    await persistAccount(userId, acct);
    return { status: "ok" as const };
  });

/** Hosted Stripe Express dashboard link so the business can manage bank, payout schedule, KYC. */
export const createConnectDashboardLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => envSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.stripe_connect_account_id) {
      throw new Error("No Connect account on file");
    }
    const stripe = createStripeClient(data.environment as StripeEnv);
    const link = await stripe.accounts.createLoginLink(profile.stripe_connect_account_id);
    return { url: link.url };
  });

/** Server-internal helper for booking flow / webhook. */
export async function refreshConnectAccountById(
  accountId: string,
  env: StripeEnv,
): Promise<void> {
  const stripe = createStripeClient(env);
  const acct = await stripe.accounts.retrieve(accountId);
  const userId = (acct.metadata as any)?.travidz_user_id as string | undefined;
  if (!userId) {
    // Fall back to lookup by stored account id
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_connect_account_id", accountId)
      .maybeSingle();
    if (!data?.id) return;
    await persistAccount(data.id, acct);
    return;
  }
  await persistAccount(userId, acct);
}
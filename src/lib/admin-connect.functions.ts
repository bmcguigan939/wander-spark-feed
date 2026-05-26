import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";
import { refreshConnectAccountById } from "@/lib/stripe-connect.functions";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

const envSchema = z.object({ environment: z.enum(["sandbox", "live"]) });

export const adminListConnectAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { data: bizRoles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "business");
    if (rolesErr) throw new Error(rolesErr.message);
    const bizIds = (bizRoles ?? []).map((r) => r.user_id as string);
    if (bizIds.length === 0) return { accounts: [] };

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id,display_name,username,business_name,operator_site_url,stripe_connect_account_id,stripe_connect_status,stripe_connect_charges_enabled,stripe_connect_payouts_enabled,stripe_connect_requirements,stripe_connect_country,stripe_connect_default_currency,stripe_connect_updated_at,payout_method",
      )
      .in("id", bizIds)
      .order("stripe_connect_updated_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.id);
    const { data: payouts } = ids.length
      ? await supabaseAdmin
          .from("connect_payouts")
          .select("business_id,amount_cents,currency,status,arrival_date,created_at")
          .in("business_id", ids)
          .order("created_at", { ascending: false })
      : { data: [] as any[] };

    const lastByBiz = new Map<string, any>();
    for (const p of payouts ?? []) {
      if (!lastByBiz.has(p.business_id as string)) lastByBiz.set(p.business_id as string, p);
    }

    return {
      accounts: (profiles ?? []).map((p) => {
        const req = (p.stripe_connect_requirements as any) ?? null;
        const currentlyDue = Array.isArray(req?.currently_due) ? req.currently_due.length : 0;
        const disabledReason = req?.disabled_reason ?? null;
        return {
          id: p.id,
          display_name: p.business_name || p.display_name || p.username || p.id.slice(0, 8),
          account_type: p.operator_site_url ? "operator" : "hotel",
          connect_account_id: p.stripe_connect_account_id,
          status: p.stripe_connect_status,
          charges_enabled: p.stripe_connect_charges_enabled,
          payouts_enabled: p.stripe_connect_payouts_enabled,
          country: p.stripe_connect_country,
          currency: p.stripe_connect_default_currency,
          currently_due_count: currentlyDue,
          disabled_reason: disabledReason,
          updated_at: p.stripe_connect_updated_at,
          payout_method: p.payout_method,
          last_payout: lastByBiz.get(p.id) ?? null,
        };
      }),
    };
  });

export const adminRefreshConnectAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    envSchema.extend({ profile_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", data.profile_id)
      .maybeSingle();
    if (!prof?.stripe_connect_account_id) {
      return { ok: false as const, error: "No Connect account on file" };
    }
    await refreshConnectAccountById(prof.stripe_connect_account_id, data.environment as StripeEnv);
    return { ok: true as const };
  });

export const adminConnectDashboardLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    envSchema.extend({ profile_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", data.profile_id)
      .maybeSingle();
    if (!prof?.stripe_connect_account_id) throw new Error("No Connect account on file");
    const stripe = createStripeClient(data.environment as StripeEnv);
    const link = await stripe.accounts.createLoginLink(prof.stripe_connect_account_id);
    return { url: link.url };
  });
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type EarningsMonth = {
  month: string;
  redemption_count: number;
  gross_order_cents: number;
  commission_cents_total: number;
  payable_cents: number;
  pending_cents: number;
};

export const getCreatorEarningsSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("creator_earnings_monthly")
      .select("month,redemption_count,gross_order_cents,commission_cents_total,payable_cents,pending_cents")
      .eq("creator_id", userId)
      .order("month", { ascending: false })
      .limit(24);
    if (error) return { months: [] as EarningsMonth[], totals: empty(), error: error.message };
    const months = (data ?? []) as EarningsMonth[];
    const totals = months.reduce(
      (acc, m) => {
        acc.lifetime_commission_cents += Number(m.commission_cents_total ?? 0);
        acc.payable_cents += Number(m.payable_cents ?? 0);
        acc.pending_cents += Number(m.pending_cents ?? 0);
        acc.redemption_count += Number(m.redemption_count ?? 0);
        return acc;
      },
      empty(),
    );
    const nowMonth = new Date();
    nowMonth.setDate(1);
    const thisMonthKey = nowMonth.toISOString().slice(0, 10);
    const thisMonth = months.find((m) => String(m.month).slice(0, 10) === thisMonthKey);
    totals.this_month_commission_cents = Number(thisMonth?.commission_cents_total ?? 0);
    return { months, totals, error: null };
  });

function empty() {
  return {
    lifetime_commission_cents: 0,
    payable_cents: 0,
    pending_cents: 0,
    this_month_commission_cents: 0,
    redemption_count: 0,
  };
}

export const getCreatorEarningsByDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ month: z.string().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    let q = supabaseAdmin
      .from("deal_redemptions")
      .select("deal_id,status,commission_cents,order_value_cents,confirmed_at,created_at,deals(title,image_url)")
      .eq("creator_id", userId)
      .eq("status", "confirmed");
    if (data.month) {
      const from = new Date(data.month);
      const to = new Date(from); to.setMonth(to.getMonth() + 1);
      q = q.gte("confirmed_at", from.toISOString()).lt("confirmed_at", to.toISOString());
    }
    const { data: rows, error } = await q;
    if (error) return { deals: [], error: error.message };
    const map = new Map<string, { deal_id: string; title: string; image_url: string | null; redemption_count: number; commission_cents: number; gross_cents: number }>();
    for (const r of rows ?? []) {
      const key = r.deal_id as string;
      const cur = map.get(key) ?? {
        deal_id: key,
        title: (r as any).deals?.title ?? "Untitled deal",
        image_url: (r as any).deals?.image_url ?? null,
        redemption_count: 0,
        commission_cents: 0,
        gross_cents: 0,
      };
      cur.redemption_count += 1;
      cur.commission_cents += (r as any).commission_cents ?? 0;
      cur.gross_cents += (r as any).order_value_cents ?? 0;
      map.set(key, cur);
    }
    return {
      deals: Array.from(map.values()).sort((a, b) => b.commission_cents - a.commission_cents),
      error: null,
    };
  });
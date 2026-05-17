import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

/* ---------- Creator-facing ---------- */

export const listCreatorPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("payout_runs")
      .select("id,period_start,period_end,total_cents,redemption_count,status,paid_at,external_reference,currency,created_at")
      .eq("creator_id", userId)
      .order("period_start", { ascending: false })
      .limit(50);
    if (error) return { runs: [] as any[], error: error.message };
    return { runs: data ?? [], error: null };
  });

export const getCreatorPayoutDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("creator_payout_details")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return { details: data ?? null };
  });

const payoutDetailsSchema = z.object({
  account_holder_name: z.string().max(120).nullable().optional(),
  bank_name: z.string().max(120).nullable().optional(),
  country: z.string().max(80).nullable().optional(),
  iban: z.string().max(64).nullable().optional(),
  sort_code: z.string().max(20).nullable().optional(),
  account_number: z.string().max(40).nullable().optional(),
  swift_bic: z.string().max(20).nullable().optional(),
  tax_id: z.string().max(40).nullable().optional(),
  payout_email: z.string().email().max(255).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const upsertCreatorPayoutDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => payoutDetailsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("creator_payout_details")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/* ---------- Admin-facing ---------- */

export const adminListPayoutRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ status: z.enum(["draft", "approved", "paid", "void", "all"]).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("payout_runs")
      .select("id,creator_id,period_start,period_end,total_cents,redemption_count,status,paid_at,external_reference,currency,created_at,notes,profiles:creator_id(username,display_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) return { runs: [] as any[], error: error.message };
    return { runs: rows ?? [], error: null };
  });

export const adminGetPayoutRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: run, error } = await supabaseAdmin
      .from("payout_runs")
      .select("*,profiles:creator_id(username,display_name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !run) return { run: null, items: [], details: null, error: error?.message ?? "Not found" };
    const { data: items } = await supabaseAdmin
      .from("payout_line_items")
      .select("id,redemption_id,commission_cents,currency,created_at,deal_redemptions(code,deal_id,confirmed_at,order_value_cents,deals(title))")
      .eq("payout_run_id", data.id);
    const { data: details } = await supabaseAdmin
      .from("creator_payout_details")
      .select("*")
      .eq("user_id", (run as any).creator_id)
      .maybeSingle();
    return { run, items: items ?? [], details: details ?? null, error: null };
  });

export const adminGenerateDraftRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        period_start: z.string().optional(),
        period_end: z.string().optional(),
        min_payout_cents: z.number().int().min(0).max(1_000_000).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin.rpc("generate_draft_payout_runs", {
      _period_start: (data.period_start ?? undefined) as any,
      _period_end: (data.period_end ?? undefined) as any,
      _min_payout_cents: data.min_payout_cents ?? 2000,
    });
    if (error) return { ok: false as const, error: error.message, created: 0 };
    return { ok: true as const, created: (rows ?? []).length, runs: rows ?? [] };
  });

export const adminUpdatePayoutRunStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["approve", "mark_paid", "void"]),
        external_reference: z.string().max(120).optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const now = new Date().toISOString();
    let patch: any = {};
    if (data.action === "approve") {
      patch = { status: "approved", approved_at: now, approved_by: context.userId };
    } else if (data.action === "mark_paid") {
      if (!data.external_reference || data.external_reference.trim().length < 3) {
        return { ok: false as const, error: "External reference required" };
      }
      patch = {
        status: "paid",
        paid_at: now,
        paid_by: context.userId,
        external_reference: data.external_reference.trim(),
        ...(data.notes ? { notes: data.notes } : {}),
      };
    } else if (data.action === "void") {
      patch = { status: "void", notes: data.notes ?? null };
    }
    const { error } = await supabaseAdmin.from("payout_runs").update(patch).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };

    // If voided, detach line items so redemptions can be re-included in a future run
    if (data.action === "void") {
      const { data: items } = await supabaseAdmin
        .from("payout_line_items")
        .select("redemption_id")
        .eq("payout_run_id", data.id);
      const ids = (items ?? []).map((i: any) => i.redemption_id);
      if (ids.length) {
        await supabaseAdmin.from("deal_redemptions").update({ payout_run_id: null }).in("id", ids);
        await supabaseAdmin.from("payout_line_items").delete().eq("payout_run_id", data.id);
      }
    }
    return { ok: true as const };
  });

export const adminExportPayoutRunCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: run } = await supabaseAdmin
      .from("payout_runs")
      .select("id,creator_id,period_start,period_end,total_cents,currency,status,profiles:creator_id(username,display_name)")
      .eq("id", data.id)
      .maybeSingle();
    if (!run) return { csv: "", filename: "payout.csv" };
    const { data: items } = await supabaseAdmin
      .from("payout_line_items")
      .select("commission_cents,currency,deal_redemptions(code,confirmed_at,order_value_cents,deals(title))")
      .eq("payout_run_id", data.id);
    const header = ["code", "deal_title", "confirmed_at", "order_value", "commission", "currency"].join(",");
    const rows = (items ?? []).map((i: any) => {
      const r = i.deal_redemptions;
      const cells = [
        r?.code ?? "",
        (r?.deals?.title ?? "").replace(/"/g, '""'),
        r?.confirmed_at ?? "",
        ((r?.order_value_cents ?? 0) / 100).toFixed(2),
        ((i.commission_cents ?? 0) / 100).toFixed(2),
        i.currency,
      ];
      return cells.map((c) => `"${c}"`).join(",");
    });
    const csv = [header, ...rows].join("\n");
    const handle = (run as any).profiles?.username ?? (run as any).creator_id;
    const filename = `payout-${handle}-${(run as any).period_start}.csv`;
    return { csv, filename };
  });
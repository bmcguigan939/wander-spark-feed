import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const roomSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional().nullable(),
  photos: z.array(z.string().url().max(500)).max(10).optional(),
  bed_config: z
    .array(
      z.object({
        type: z.string().min(1).max(40),
        count: z.number().int().min(1).max(10),
      }),
    )
    .max(8)
    .optional(),
  room_size_sqm: z.number().min(0).max(2000).optional().nullable(),
  max_guests: z.number().int().min(1).max(20).default(2),
  inventory_total: z.number().int().min(0).max(10000).optional().nullable(),
  sort_order: z.number().int().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
});

const ratePlanSchema = z.object({
  room_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(120),
  price_cents: z.number().int().min(0).max(10_000_000),
  compare_at_price_cents: z.number().int().min(0).max(10_000_000).optional().nullable(),
  currency: z.string().length(3).default("GBP"),
  cancellation_policy_code: z
    .enum([
      "travidz_standard",
      "free_cancel_until_start",
      "non_refundable",
      "custom_24h",
      "custom_7d",
    ])
    .default("travidz_standard"),
  payment_timing: z
    .enum(["pay_online", "pay_at_property", "deposit_online_rest_at_property"])
    .default("pay_online"),
  deposit_pct: z.number().min(1).max(99).optional().nullable(),
  breakfast: z.enum(["included", "available_paid", "none"]).default("none"),
  guests_included: z.number().int().min(1).max(20).default(1),
  perks: z.array(z.string().min(1).max(80)).max(10).optional(),
  discount_label: z.string().max(40).optional().nullable(),
  sort_order: z.number().int().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
});

async function ensureOwnDeal(dealId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("deals")
    .select("id,business_id")
    .eq("id", dealId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.business_id !== userId) throw new Error("Not allowed");
}

// ------- Public reader (used by traveller deal page + booking) -------
export const getDealRoomsAndRates = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ dealId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const [{ data: rooms }, { data: rates }] = await Promise.all([
      supabaseAdmin
        .from("deal_rooms")
        .select("*")
        .eq("deal_id", data.dealId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("deal_rate_plans")
        .select("*")
        .eq("deal_id", data.dealId)
        .order("sort_order", { ascending: true })
        .order("price_cents", { ascending: true }),
    ]);
    return { rooms: rooms ?? [], ratePlans: rates ?? [] };
  });

// ------- Room CRUD -------
export const upsertRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        dealId: z.string().uuid(),
        patch: roomSchema.partial().extend({ name: z.string().min(1).max(120) }),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureOwnDeal(data.dealId, context.userId);
    const payload = { ...data.patch, deal_id: data.dealId } as any;
    if (data.patch.inventory_total != null) {
      payload.inventory_remaining = data.patch.inventory_total;
    }
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("deal_rooms")
        .update(payload)
        .eq("id", data.id)
        .eq("deal_id", data.dealId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("deal_rooms")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), dealId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureOwnDeal(data.dealId, context.userId);
    const { error } = await supabaseAdmin
      .from("deal_rooms")
      .delete()
      .eq("id", data.id)
      .eq("deal_id", data.dealId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Rate plan CRUD -------
export const upsertRatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        dealId: z.string().uuid(),
        patch: ratePlanSchema.partial().extend({
          name: z.string().min(1).max(120),
          price_cents: z.number().int().min(0).max(10_000_000),
        }),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureOwnDeal(data.dealId, context.userId);
    const payload = { ...data.patch, deal_id: data.dealId } as any;
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("deal_rate_plans")
        .update(payload)
        .eq("id", data.id)
        .eq("deal_id", data.dealId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("deal_rate_plans")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteRatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), dealId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureOwnDeal(data.dealId, context.userId);
    const { error } = await supabaseAdmin
      .from("deal_rate_plans")
      .delete()
      .eq("id", data.id)
      .eq("deal_id", data.dealId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
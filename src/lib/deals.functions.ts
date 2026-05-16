import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const dealSelect =
  "id,title,description,destination,country,city,discount_label,price_cents,currency,url,image_url,starts_at,ends_at,is_active,click_count,business_id,business:profiles!deals_business_id_fkey(id,username,display_name,avatar_url)";

const filterSchema = z
  .object({
    country: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    destination: z.string().max(160).optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .default({});

export const listDeals = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => filterSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("deals")
      .select(dealSelect)
      .eq("is_active", true)
      .or("starts_at.is.null,starts_at.lte.now()")
      .or("ends_at.is.null,ends_at.gte.now()")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.country) q = q.ilike("country", data.country);
    if (data.city) q = q.ilike("city", data.city);
    if (data.destination) q = q.ilike("destination", data.destination);
    const { data: deals, error } = await q;
    if (error) throw new Error(error.message);
    return { deals: deals ?? [] };
  });

export const getDeal = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: deal, error } = await supabaseAdmin
      .from("deals")
      .select(dealSelect)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!deal) throw new Error("Deal not found");
    return { deal };
  });

const upsertSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  url: z.string().url().max(500),
  image_url: z.string().url().max(500).optional(),
  destination: z.string().max(160).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  discount_label: z.string().max(40).optional(),
  price_cents: z.number().int().min(0).max(10_000_000).optional(),
  currency: z.string().length(3).optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
});

export const createDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("deals")
      .insert({ ...data, business_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), patch: upsertSchema.partial() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("deals")
      .update(data.patch)
      .eq("id", data.id)
      .eq("business_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("deals").delete().eq("id", data.id).eq("business_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyDeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("deals")
      .select(dealSelect)
      .eq("business_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { deals: data ?? [] };
  });

export const logDealClick = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        dealId: z.string().uuid(),
        referrerVideoId: z.string().uuid().optional(),
        userId: z.string().uuid().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    await supabaseAdmin.from("deal_clicks").insert({
      deal_id: data.dealId,
      referrer_video_id: data.referrerVideoId ?? null,
      user_id: data.userId ?? null,
    });
    return { ok: true };
  });

export const applyForBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "business" });
    if (error && (error as any).code !== "23505") throw new Error(error.message);
    return { ok: true };
  });

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { roles: (data ?? []).map((r) => r.role as string) };
  });
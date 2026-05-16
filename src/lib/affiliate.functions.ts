import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AffiliateProvider =
  | "booking_com"
  | "getyourguide"
  | "viator"
  | "skyscanner"
  | "airalo"
  | "expedia"
  | "agoda"
  | "custom";

export type AffiliateLink = {
  id: string;
  creator_id: string;
  video_id: string | null;
  provider: AffiliateProvider;
  label: string;
  url: string;
  commission_pct: number | null;
  is_active: boolean;
  click_count: number;
  created_at: string;
};

const providerEnum = z.enum([
  "booking_com",
  "getyourguide",
  "viator",
  "skyscanner",
  "airalo",
  "expedia",
  "agoda",
  "custom",
]);

const linkInput = z.object({
  video_id: z.string().uuid().nullable().optional(),
  provider: providerEnum.default("custom"),
  label: z.string().min(1).max(80),
  url: z.string().url().max(800),
  commission_pct: z.number().min(0).max(100).nullable().optional(),
});

export const listMyAffiliateLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AffiliateLink[]> => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("affiliate_links")
      .select("*")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data as AffiliateLink[]) ?? [];
  });

export const createAffiliateLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => linkInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("affiliate_links")
      .insert({
        creator_id: userId,
        video_id: data.video_id ?? null,
        provider: data.provider,
        label: data.label,
        url: data.url,
        commission_pct: data.commission_pct ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row!.id };
  });

export const toggleAffiliateLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("affiliate_links")
      .update({ is_active: data.is_active })
      .eq("id", data.id)
      .eq("creator_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAffiliateLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("affiliate_links")
      .delete()
      .eq("id", data.id)
      .eq("creator_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listVideoAffiliateLinks = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ videoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<AffiliateLink[]> => {
    const { data: rows, error } = await supabaseAdmin
      .from("affiliate_links")
      .select("*")
      .eq("video_id", data.videoId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows as AffiliateLink[]) ?? [];
  });

export const PROVIDER_LABELS: Record<AffiliateProvider, string> = {
  booking_com: "Booking.com",
  getyourguide: "GetYourGuide",
  viator: "Viator",
  skyscanner: "Skyscanner",
  airalo: "Airalo",
  expedia: "Expedia",
  agoda: "Agoda",
  custom: "Custom link",
};
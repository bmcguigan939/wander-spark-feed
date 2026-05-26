import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

// Every shop sells through Travidz, but we still require the operator's
// own website URL so the price-comparison scanner can EXCLUDE that host
// from its competitor scrape (we should never match against their own site).
function normaliseHost(raw: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

export const getMyOperatorSite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("business_website_url")
      .eq("id", context.userId)
      .maybeSingle();
    const url = (data as any)?.business_website_url ?? null;
    return {
      operator_site_url: url,
      operator_site_host: url ? normaliseHost(url) : null,
    };
  });

const updateSchema = z.object({
  operator_site_url: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .regex(/^([a-z0-9][a-z0-9-]*\.)+[a-z]{2}[a-z]*(\/[^\s]*)?$|^https?:\/\/[^\s]+$/i, {
      message: "Enter a valid website like https://yourshop.com",
    }),
});

export const updateMyOperatorSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const raw = data.operator_site_url.trim();
    const normalised = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const host = normaliseHost(normalised);
    if (!host) throw new Error("Couldn't parse that URL — try the full https:// link.");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ business_website_url: normalised })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, operator_site_url: normalised, operator_site_host: host };
  });
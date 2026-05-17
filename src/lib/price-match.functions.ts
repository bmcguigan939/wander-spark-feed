import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMatchCode = createServerFn({ method: "GET" })
  .inputValidator((d: { code: string }) => z.object({ code: z.string().min(8).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("price_match_codes")
      .select(
        "code,link_id,original_price_cents,matched_price_cents,currency,competitor_network,competitor_url,expires_at,status,issued_at",
      )
      .eq("code", data.code)
      .maybeSingle();
    if (!row) return { code: null };

    const { data: link } = await supabaseAdmin
      .from("affiliate_links")
      .select("url,label")
      .eq("id", row.link_id)
      .maybeSingle();

    return {
      code: row,
      link: link ?? null,
    };
  });

/** Business-side audit data */
export const listParityChecksForBusiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: links } = await supabaseAdmin
      .from("affiliate_links")
      .select("id,label,parity_exempt,parity_exempt_reason,is_active")
      .eq("business_id", userId);
    const linkIds = (links ?? []).map((l) => l.id);
    if (linkIds.length === 0) return { checks: [], codes: [], links: [] };

    const { data: checks } = await supabaseAdmin
      .from("parity_checks")
      .select("*")
      .in("link_id", linkIds)
      .order("ran_at", { ascending: false })
      .limit(100);

    const { data: codes } = await supabaseAdmin
      .from("price_match_codes")
      .select("*")
      .eq("business_id", userId)
      .order("issued_at", { ascending: false })
      .limit(100);

    return { checks: checks ?? [], codes: codes ?? [], links: links ?? [] };
  });

export const disputeMatchCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; reason: string }) =>
    z.object({ code: z.string().min(8).max(40), reason: z.string().min(5).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("price_match_codes")
      .update({
        status: "disputed",
        dispute_reason: data.reason,
      })
      .eq("code", data.code)
      .eq("business_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Business toggles parity-exempt on one of their listings. Use sparingly —
 * agreement requires a written reason for exempt listings (e.g. members-only
 * rate, package excluded by contract). */
export const setParityExempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { linkId: string; exempt: boolean; reason?: string }) =>
    z
      .object({
        linkId: z.string().uuid(),
        exempt: z.boolean(),
        reason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (data.exempt && (!data.reason || data.reason.trim().length < 5)) {
      throw new Error("A reason is required to mark a listing parity-exempt");
    }
    const { error } = await supabaseAdmin
      .from("affiliate_links")
      .update({
        parity_exempt: data.exempt,
        parity_exempt_reason: data.exempt ? data.reason!.trim() : null,
      })
      .eq("id", data.linkId)
      .eq("business_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
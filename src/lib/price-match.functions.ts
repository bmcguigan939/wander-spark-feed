
/** Admin lists all disputed price-match codes for resolution. */
export const listDisputedMatchCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const { data: isAdminRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdminRows) throw new Error("Forbidden");
    const { data: codes } = await supabaseAdmin
      .from("price_match_codes")
      .select("*")
      .eq("status", "disputed")
      .order("issued_at", { ascending: false })
      .limit(200);
    return { codes: codes ?? [] };
  });

/** Admin resolves a dispute: either rejects it (match stands) or upholds it
 * (status → 'dispute_rejected' for the business, meaning the business's
 * dispute is upheld and the code is invalidated). */
export const resolveMatchDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; decision: "uphold_match" | "uphold_business"; note?: string }) =>
    z
      .object({
        code: z.string().min(8).max(40),
        decision: z.enum(["uphold_match", "uphold_business"]),
        note: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: isAdminRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdminRows) throw new Error("Forbidden");
    // uphold_match: match stays, code goes back to 'issued' (or 'redeemed' if already used).
    // uphold_business: business wins, code becomes 'dispute_rejected' and is unusable.
    const newStatus =
      data.decision === "uphold_business" ? ("dispute_rejected" as const) : ("issued" as const);
    const { error } = await supabaseAdmin
      .from("price_match_codes")
      .update({
        status: newStatus,
        dispute_resolved_by: userId,
        dispute_resolved_at: new Date().toISOString(),
        ...(data.note ? { dispute_evidence_url: data.note } : {}),
      })
      .eq("code", data.code);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
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

/** B11: CSV export of price-audit history for the signed-in business. */
function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const exportPriceAuditCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: links } = await supabaseAdmin
      .from("affiliate_links")
      .select("id,label")
      .eq("business_id", userId);
    const labelById = new Map((links ?? []).map((l) => [l.id, l.label]));
    const linkIds = (links ?? []).map((l) => l.id);

    const { data: checks } = linkIds.length
      ? await supabaseAdmin
          .from("parity_checks")
          .select("*")
          .in("link_id", linkIds)
          .order("ran_at", { ascending: false })
          .limit(2000)
      : { data: [] as any[] };

    const { data: codes } = await supabaseAdmin
      .from("price_match_codes")
      .select("*")
      .eq("business_id", userId)
      .order("issued_at", { ascending: false })
      .limit(2000);

    const codeByLink = new Map<string, any>();
    for (const c of codes ?? []) codeByLink.set(`${c.link_id}|${c.issued_at}`, c);

    const headers = [
      "date",
      "link_label",
      "providers_checked",
      "direct_price_cents",
      "competitor_network",
      "competitor_price_cents",
      "action",
      "match_code",
      "match_status",
      "evidence_url",
    ];
    const rows = [headers.join(",")];
    for (const r of checks ?? []) {
      // Best-effort: find a code issued near this check's timestamp
      const matchedCode = (codes ?? []).find(
        (c) =>
          c.link_id === r.link_id &&
          Math.abs(new Date(c.issued_at).getTime() - new Date(r.ran_at).getTime()) < 5000,
      );
      rows.push(
        [
          new Date(r.ran_at).toISOString(),
          labelById.get(r.link_id) ?? "",
          (r.providers_checked ?? []).join("|"),
          r.direct_price_cents ?? "",
          r.cheapest_network ?? "",
          r.cheapest_price_cents ?? "",
          r.action ?? "",
          matchedCode?.code ?? "",
          matchedCode?.status ?? "",
          matchedCode?.evidence_url ?? "",
        ]
          .map(csvEscape)
          .join(","),
      );
    }
    return { csv: rows.join("\n"), filename: `travidz-price-audit-${new Date().toISOString().slice(0, 10)}.csv` };
  });
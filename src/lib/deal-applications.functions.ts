import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const applicationSelect =
  "id,deal_id,creator_id,business_id,status,pitch,requested_code,approved_code,commission_pct,decided_at,created_at,updated_at," +
  "deal:deals!deal_applications_deal_id_fkey(id,title,image_url,country,city,destination,url,discount_label)," +
  "creator:profiles!deal_applications_creator_id_fkey(id,username,display_name,avatar_url)," +
  "business:profiles!deal_applications_business_id_fkey(id,username,display_name,avatar_url)";

export const applyForDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        dealId: z.string().uuid(),
        pitch: z.string().min(10).max(1500),
        requestedCode: z.string().max(40).optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: deal, error: dealErr } = await supabaseAdmin
      .from("deals")
      .select("id,business_id,is_active")
      .eq("id", data.dealId)
      .maybeSingle();
    if (dealErr) throw new Error(dealErr.message);
    if (!deal) throw new Error("Deal not found");
    if (!deal.is_active) throw new Error("Deal is not active");
    if (deal.business_id === userId) throw new Error("You can't apply to your own deal");

    const { data: row, error } = await supabase
      .from("deal_applications")
      .insert({
        deal_id: data.dealId,
        creator_id: userId,
        business_id: deal.business_id,
        pitch: data.pitch,
        requested_code: data.requestedCode ?? null,
      })
      .select("id")
      .single();
    if (error) {
      if ((error as any).code === "23505") throw new Error("You have already applied for this deal");
      throw new Error(error.message);
    }
    return { id: row.id };
  });

export const withdrawApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("deal_applications")
      .update({ status: "withdrawn" })
      .eq("id", data.id)
      .eq("creator_id", userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const decideApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "declined"]),
        approvedCode: z.string().max(40).optional(),
        commissionPct: z.number().min(0).max(100).optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = {
      status: data.decision,
      decided_at: new Date().toISOString(),
      decided_by: userId,
    };
    if (data.decision === "approved") {
      if (data.approvedCode !== undefined) patch.approved_code = data.approvedCode;
      if (data.commissionPct !== undefined) patch.commission_pct = data.commissionPct;
    }
    const { error } = await (supabase as any)
      .from("deal_applications")
      .update(patch)
      .eq("id", data.id)
      .eq("business_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("deal_applications")
      .select(applicationSelect)
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { applications: data ?? [] };
  });

export const listApplicationsForBusiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ dealId: z.string().uuid().optional() }).default({}).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("deal_applications")
      .select(applicationSelect)
      .eq("business_id", userId)
      .order("created_at", { ascending: false });
    if (data.dealId) q = q.eq("deal_id", data.dealId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { applications: rows ?? [] };
  });

export const getMyApplicationForDeal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ dealId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("deal_applications")
      .select(applicationSelect)
      .eq("deal_id", data.dealId)
      .eq("creator_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { application: row };
  });
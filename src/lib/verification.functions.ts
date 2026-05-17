import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin role required");
}

export const setProfileVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      userId: z.string().uuid(),
      verified: z.boolean(),
      notes: z.string().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch = {
      is_verified: data.verified,
      verified_at: data.verified ? new Date().toISOString() : null,
      verified_by: data.verified ? context.userId : null,
      ...(data.notes !== undefined ? { verification_notes: data.notes } : {}),
    };
    const { error } = await (supabaseAdmin.from("profiles") as any).update(patch).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_actions").insert({
      admin_id: context.userId,
      action: data.verified ? "verify_profile" : "unverify_profile",
      target_type: "user",
      target_id: data.userId,
      notes: data.notes ?? null,
    });
    return { ok: true };
  });

export const acceptAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ kind: z.enum(["creator", "business"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const col =
      data.kind === "creator"
        ? "creator_agreement_accepted_at"
        : "business_agreement_accepted_at";
    const { error } = await (supabaseAdmin.from("profiles") as any)
      .update({ [col]: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyAgreementStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("creator_agreement_accepted_at,business_agreement_accepted_at,is_verified")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      creator_accepted: !!data?.creator_agreement_accepted_at,
      business_accepted: !!data?.business_agreement_accepted_at,
      is_verified: !!data?.is_verified,
    };
  });
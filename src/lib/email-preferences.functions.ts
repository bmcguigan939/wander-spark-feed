import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type EmailPreferences = {
  notify_redemption: boolean;
  notify_expiry: boolean;
  notify_social: boolean;
  notify_applications: boolean;
};

const DEFAULTS: EmailPreferences = {
  notify_redemption: true,
  notify_expiry: true,
  notify_social: true,
  notify_applications: true,
};

export const getEmailPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("email_preferences")
      .select("notify_redemption,notify_expiry,notify_social,notify_applications")
      .eq("user_id", userId)
      .maybeSingle();
    return { preferences: (data ?? DEFAULTS) as EmailPreferences };
  });

export const updateEmailPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        notify_redemption: z.boolean().optional(),
        notify_expiry: z.boolean().optional(),
        notify_social: z.boolean().optional(),
        notify_applications: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const payload = { user_id: userId, ...data };
    const { error } = await supabaseAdmin
      .from("email_preferences")
      .upsert(payload, { onConflict: "user_id" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
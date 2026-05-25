import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type NotificationPreferences = {
  notify_followers: boolean;
  notify_replies: boolean;
  notify_deal_expiring: boolean;
  notify_weekly_digest: boolean;
};

const DEFAULTS: NotificationPreferences = {
  notify_followers: true,
  notify_replies: true,
  notify_deal_expiring: true,
  notify_weekly_digest: true,
};

export const getNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("notification_preferences")
      .select("notify_followers, notify_replies, notify_deal_expiring, notify_weekly_digest")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { preferences: (data as NotificationPreferences | null) ?? DEFAULTS };
  });

export const updateNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        notify_followers: z.boolean().optional(),
        notify_replies: z.boolean().optional(),
        notify_deal_expiring: z.boolean().optional(),
        notify_weekly_digest: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("notification_preferences")
      .upsert(
        { user_id: userId, ...data },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Server-only helper: returns true if the user has opted in to the given
 * push category. Used by sendPushToUser fan-out logic before hitting
 * OneSignal so we never deliver pushes the user has disabled.
 */
export async function userHasOptedIn(
  userId: string,
  category: keyof NotificationPreferences,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("notification_preferences")
    .select(category)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return DEFAULTS[category];
  return (data as Record<string, boolean>)[category] ?? DEFAULTS[category];
}
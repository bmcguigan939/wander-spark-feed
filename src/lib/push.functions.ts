/**
 * Push notification server functions.
 *
 * Sending: server → OneSignal REST API. The mobile client (Capacitor +
 * onesignal-cordova-plugin) registers the device on launch and calls
 * `registerPushSubscription` to associate its OneSignal player ID with
 * the authenticated user. The server then targets users by `external_id`
 * (= our Supabase user id), so we never have to track per-device IDs from
 * the server side.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ONESIGNAL_REST_BASE = "https://api.onesignal.com";

function getOneSignalCreds() {
  const appId = process.env.ONESIGNAL_APP_ID;
  const restKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !restKey) {
    return null;
  }
  return { appId, restKey };
}

/**
 * Called by the native client after the user grants notification permission.
 * Stores the OneSignal player id against the user so we can deduplicate
 * across devices.
 */
export const registerPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        onesignalPlayerId: z.string().min(8).max(128),
        platform: z.enum(["ios", "android", "web"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          onesignal_player_id: data.onesignalPlayerId,
          platform: data.platform,
        },
        { onConflict: "user_id,onesignal_player_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Remove a player id (e.g. user signed out on this device, or revoked
 * permission).
 */
export const unregisterPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ onesignalPlayerId: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("onesignal_player_id", data.onesignalPlayerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Server-only helper to send a push to one user. Use from other server fns
 * (e.g. on new follower, deal expiring soon) — NEVER expose this directly
 * to the client.
 */
export async function sendPushToUser(opts: {
  userId: string;
  title: string;
  body: string;
  deepLink?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const creds = getOneSignalCreds();
  if (!creds) {
    console.warn("[push] OneSignal credentials not configured; skipping send");
    return { ok: false, reason: "no_credentials" };
  }
  try {
    const res = await fetch(`${ONESIGNAL_REST_BASE}/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${creds.restKey}`,
      },
      body: JSON.stringify({
        app_id: creds.appId,
        include_aliases: { external_id: [opts.userId] },
        target_channel: "push",
        headings: { en: opts.title },
        contents: { en: opts.body },
        url: opts.deepLink,
        // iOS specific tuning
        ios_sound: "default",
        ios_badgeType: "Increase",
        ios_badgeCount: 1,
        // Android specific tuning
        android_channel_id: undefined,
        small_icon: "ic_stat_onesignal_default",
        large_icon: undefined,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[push] OneSignal send failed ${res.status}: ${text}`);
      return { ok: false, reason: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[push] OneSignal send threw:", err);
    return { ok: false, reason: "exception" };
  }
}
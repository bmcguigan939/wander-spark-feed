import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Export everything the authenticated user has in the system as a single JSON
 * blob. Returned as a plain object so the client can JSON.stringify it for
 * download.
 */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const tables = [
      "profiles",
      "user_roles",
      "profile_socials",
      "videos",
      "video_deals",
      "comments",
      "likes",
      "saves",
      "follows",
      "notifications",
      "collections",
      "collection_items",
      "itineraries",
      "deal_applications",
      "deals",
      "affiliate_links",
      "business_invites",
    ] as const;

    const result: Record<string, any> = { exported_at: new Date().toISOString(), user_id: userId };

    for (const t of tables) {
      // pick the right ownership column per table
      let column: string;
      if (t === "profiles") column = "id";
      else if (t === "videos" || t === "affiliate_links") column = "creator_id";
      else if (t === "deals") column = "business_id";
      else if (t === "collections") column = "owner_id";
      else if (t === "follows") column = "follower_id";
      else if (t === "business_invites") column = "creator_id";
      else if (t === "deal_applications") column = "creator_id";
      else column = "user_id";

      try {
        const { data } = await (supabaseAdmin as any)
          .from(t)
          .select("*")
          .eq(column, userId)
          .limit(10000);
        result[t] = data ?? [];
      } catch (e) {
        result[t] = { error: (e as Error).message };
      }
    }

    return { json: JSON.stringify(result, null, 2) };
  });

/**
 * Permanently delete the authenticated user's account.
 * Cascading FKs (added in the phase-0 migration) wipe child rows.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { confirm: string }) => {
    if (input?.confirm !== "DELETE") throw new Error("Please type DELETE to confirm");
    return input;
  })
  .handler(async ({ context }) => {
    const { userId } = context;

    // Best-effort cleanup of rows that may not cascade from auth.users
    await Promise.allSettled([
      supabaseAdmin.from("videos").delete().eq("creator_id", userId),
      supabaseAdmin.from("collections").delete().eq("owner_id", userId),
      supabaseAdmin.from("itineraries").delete().eq("user_id", userId),
      supabaseAdmin.from("affiliate_links").delete().eq("creator_id", userId),
      supabaseAdmin.from("business_invites").delete().eq("creator_id", userId),
      supabaseAdmin.from("deal_applications").delete().eq("creator_id", userId),
      supabaseAdmin.from("deals").delete().eq("business_id", userId),
      supabaseAdmin.from("profile_socials").delete().eq("user_id", userId),
      supabaseAdmin.from("user_roles").delete().eq("user_id", userId),
      supabaseAdmin.from("profiles").delete().eq("id", userId),
    ]);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

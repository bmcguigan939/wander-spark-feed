import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FollowingCreator = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export const getMyFollowing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: follows, error } = await supabase
      .from("follows")
      .select("creator_id, created_at")
      .eq("follower_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (follows ?? []).map((r) => r.creator_id as string);
    if (ids.length === 0) return { creators: [] as FollowingCreator[], ids };
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);
    const byId = new Map<string, FollowingCreator>(
      (profiles ?? []).map((p) => [p.id as string, p as FollowingCreator]),
    );
    const creators = ids.map((i) => byId.get(i)).filter(Boolean) as FollowingCreator[];
    return { creators, ids };
  });
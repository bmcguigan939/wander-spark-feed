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
    const { data, error } = await supabase
      .from("follows")
      .select("creator_id, created_at, profiles:creator_id (id, username, display_name, avatar_url, bio)")
      .eq("follower_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ creator_id: string; profiles: FollowingCreator | null }>;
    const creators = rows.map((r) => r.profiles).filter(Boolean) as FollowingCreator[];
    const ids = rows.map((r) => r.creator_id);
    return { creators, ids };
  });
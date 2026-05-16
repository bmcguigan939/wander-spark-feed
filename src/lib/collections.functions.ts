import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listMyCollections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("collections")
      .select("id,title,description,visibility,cover_video_id,created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // Counts (best effort)
    const ids = (data ?? []).map((c) => c.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: items } = await supabase.from("collection_items").select("collection_id").in("collection_id", ids);
      (items ?? []).forEach((i) => { counts[i.collection_id] = (counts[i.collection_id] ?? 0) + 1; });
    }
    return { collections: (data ?? []).map((c) => ({ ...c, item_count: counts[c.id] ?? 0 })) };
  });

export const createCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      title: z.string().min(1).max(80),
      description: z.string().max(500).optional(),
      visibility: z.enum(["private", "public"]).default("private"),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("collections")
      .insert({ owner_id: userId, title: data.title, description: data.description, visibility: data.visibility })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(80).optional(),
      description: z.string().max(500).optional(),
      visibility: z.enum(["private", "public"]).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("collections").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("collection_items").delete().eq("collection_id", data.id);
    const { error } = await context.supabase.from("collections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addToCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ collectionId: z.string().uuid(), videoId: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("collection_items")
      .upsert({ collection_id: data.collectionId, video_id: data.videoId }, { onConflict: "collection_id,video_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFromCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ collectionId: z.string().uuid(), videoId: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("collection_items").delete()
      .eq("collection_id", data.collectionId).eq("video_id", data.videoId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCollection = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: collection } = await supabaseAdmin
      .from("collections")
      .select("id,owner_id,title,description,visibility,created_at,owner:profiles!collections_owner_id_fkey(username,display_name,avatar_url)")
      .eq("id", data.id).maybeSingle();
    if (!collection) return { collection: null, videos: [] };
    const { data: items } = await supabaseAdmin
      .from("collection_items")
      .select("video:videos!collection_items_video_id_fkey(id,title,thumbnail_url,mux_playback_id,like_count,creator_id), added_at")
      .eq("collection_id", data.id)
      .order("added_at", { ascending: false });
    return {
      collection,
      videos: (items ?? []).map((i: any) => i.video).filter(Boolean),
    };
  });
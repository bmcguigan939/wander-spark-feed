import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listDestinations = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("videos")
    .select("country,city,thumbnail_url")
    .eq("status", "ready")
    .not("country", "is", null)
    .limit(500);
  if (error) throw new Error(error.message);

  const countries = new Map<string, { country: string; videoCount: number; cities: Set<string>; cover: string | null }>();
  for (const row of data ?? []) {
    const c = row.country as string | null;
    if (!c) continue;
    const entry = countries.get(c) ?? { country: c, videoCount: 0, cities: new Set<string>(), cover: null };
    entry.videoCount += 1;
    if (row.city) entry.cities.add(row.city);
    if (!entry.cover && row.thumbnail_url) entry.cover = row.thumbnail_url as string;
    countries.set(c, entry);
  }
  return {
    countries: Array.from(countries.values())
      .map((e) => ({ country: e.country, videoCount: e.videoCount, cityCount: e.cities.size, cover: e.cover }))
      .sort((a, b) => b.videoCount - a.videoCount),
  };
});

export const getDestination = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ country: z.string().min(1).max(100), city: z.string().min(1).max(100).optional() }).parse(input)
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("videos")
      .select(
        "id,title,description,mux_playback_id,thumbnail_url,destination,country,city,activity_tags,budget_tag,like_count,save_count,view_count,created_at,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url)"
      )
      .eq("status", "ready")
      .ilike("country", data.country);
    if (data.city) q = q.ilike("city", data.city);
    q = q.order("like_count", { ascending: false }).order("created_at", { ascending: false }).limit(60);
    const { data: videos, error } = await q;
    if (error) throw new Error(error.message);

    const cities = new Map<string, number>();
    if (!data.city) {
      for (const v of videos ?? []) {
        const c = (v as { city: string | null }).city;
        if (c) cities.set(c, (cities.get(c) ?? 0) + 1);
      }
    }
    return {
      videos: (videos ?? []) as any[],
      cities: Array.from(cities.entries()).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count),
    };
  });
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const inputSchema = z
  .object({
    layer: z.enum(["videos", "deals", "both"]).default("both"),
    bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  })
  .default({ layer: "both" });

export type MapVideoPin = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  lat: number;
  lng: number;
  creator_username: string | null;
};

export type MapDealPin = {
  id: string;
  title: string;
  image_url: string | null;
  discount_label: string | null;
  lat: number;
  lng: number;
};

export const getMapPins = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const wantVideos = data.layer === "videos" || data.layer === "both";
    const wantDeals = data.layer === "deals" || data.layer === "both";

    const videosPromise = wantVideos
      ? supabaseAdmin
          .from("videos")
          .select(
            "id,title,thumbnail_url,lat,lng,creator:profiles!videos_creator_id_fkey(username)",
          )
          .eq("status", "ready")
          .not("lat", "is", null)
          .not("lng", "is", null)
          .limit(500)
      : Promise.resolve({ data: [] as any[], error: null });

    const dealsPromise = wantDeals
      ? supabaseAdmin
          .from("deals")
          .select("id,title,image_url,discount_label,lat,lng,is_active,starts_at,ends_at")
          .eq("is_active", true)
          .not("lat", "is", null)
          .not("lng", "is", null)
          .limit(500)
      : Promise.resolve({ data: [] as any[], error: null });

    const [vRes, dRes] = await Promise.all([videosPromise, dealsPromise]);
    if (vRes.error) throw new Error(vRes.error.message);
    if (dRes.error) throw new Error(dRes.error.message);

    const now = Date.now();
    const inBbox = (lat: number, lng: number) => {
      if (!data.bbox) return true;
      const [w, s, e, n] = data.bbox;
      return lng >= w && lng <= e && lat >= s && lat <= n;
    };

    const videos: MapVideoPin[] = (vRes.data ?? [])
      .filter((v: any) => v.lat != null && v.lng != null && inBbox(v.lat, v.lng))
      .map((v: any) => ({
        id: v.id,
        title: v.title,
        thumbnail_url: v.thumbnail_url,
        lat: v.lat,
        lng: v.lng,
        creator_username: v.creator?.username ?? null,
      }));

    const deals: MapDealPin[] = (dRes.data ?? [])
      .filter((d: any) => {
        if (d.lat == null || d.lng == null) return false;
        if (d.starts_at && new Date(d.starts_at).getTime() > now) return false;
        if (d.ends_at && new Date(d.ends_at).getTime() < now) return false;
        return inBbox(d.lat, d.lng);
      })
      .map((d: any) => ({
        id: d.id,
        title: d.title,
        image_url: d.image_url,
        discount_label: d.discount_label,
        lat: d.lat,
        lng: d.lng,
      }));

    return { videos, deals };
  });

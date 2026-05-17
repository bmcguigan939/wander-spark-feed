import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const bboxTuple = z.tuple([z.number(), z.number(), z.number(), z.number()]);
const categoryEnum = z.enum(["stay", "eat", "do", "tour", "transport", "other"]);

const pinsInput = z
  .object({
    layer: z.enum(["videos", "deals", "both"]).default("both"),
    bbox: bboxTuple.optional(),
    cat: categoryEnum.optional(),
    q: z.string().trim().max(120).optional(),
  })
  .default({ layer: "both" });

export type DealCategory = z.infer<typeof categoryEnum>;

export type MapVideoPin = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  lat: number;
  lng: number;
  creator_username: string | null;
  tags: string[] | null;
};

export type MapDealPin = {
  id: string;
  title: string;
  image_url: string | null;
  discount_label: string | null;
  lat: number;
  lng: number;
  category: DealCategory;
  business_id: string | null;
};

export type MapBusinessPin = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  lat: number;
  lng: number;
  place_name: string | null;
};

const CAT_TAG_KEYWORDS: Record<DealCategory, string[]> = {
  stay: ["hotel", "stay", "villa", "resort", "hostel", "airbnb"],
  eat: ["food", "restaurant", "cafe", "coffee", "bar", "eat", "dinner"],
  do: ["activity", "experience", "spa", "museum", "yoga", "surf", "dive", "hike"],
  tour: ["tour", "guide", "excursion", "safari", "cruise"],
  transport: ["transfer", "taxi", "rental", "flight", "ferry", "train"],
  other: [],
};

function categoryTagFilter(cat: DealCategory): string | null {
  const kws = CAT_TAG_KEYWORDS[cat];
  if (!kws.length) return null;
  return kws.map((k) => `activity_tags.cs.{${k}}`).join(",");
}

export const getMapPins = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => pinsInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const wantVideos = data.layer === "videos" || data.layer === "both";
    const wantDeals = data.layer === "deals" || data.layer === "both";
    const wantBusinesses = data.layer === "deals" || data.layer === "both";
    const limit = data.bbox ? 1000 : 500;

    const buildVideos = () => {
      let q = supabaseAdmin
        .from("videos")
        .select(
          "id,title,thumbnail_url,lat,lng,activity_tags,creator:profiles!videos_creator_id_fkey(username)",
        )
        .eq("status", "ready")
        .not("lat", "is", null)
        .not("lng", "is", null);
      if (data.bbox) {
        const [w, s, e, n] = data.bbox;
        q = q.gte("lng", w).lte("lng", e).gte("lat", s).lte("lat", n);
      }
      if (data.q) q = q.ilike("title", `%${data.q}%`);
      if (data.cat) {
        const f = categoryTagFilter(data.cat);
        if (f) q = q.or(f);
      }
      return q.limit(limit);
    };

    const buildDeals = () => {
      const nowIso = new Date().toISOString();
      let q = supabaseAdmin
        .from("deals")
        .select(
          "id,title,image_url,discount_label,lat,lng,category,business_id,is_active,starts_at,ends_at,description",
        )
        .eq("is_active", true)
        .eq("status", "approved")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`);
      if (data.bbox) {
        const [w, s, e, n] = data.bbox;
        q = q.gte("lng", w).lte("lng", e).gte("lat", s).lte("lat", n);
      }
      if (data.cat) q = q.eq("category", data.cat);
      if (data.q) q = q.or(`title.ilike.%${data.q}%,description.ilike.%${data.q}%`);
      return q.limit(limit);
    };

    const buildBusinesses = async () => {
      const roleRes = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "business");
      const ids = (roleRes.data ?? []).map((r: any) => r.user_id);
      if (!ids.length) return { data: [] as any[], error: null };
      let q = supabaseAdmin
        .from("profiles")
        .select("id,display_name,username,avatar_url,lat,lng,place_name")
        .in("id", ids)
        .not("lat", "is", null)
        .not("lng", "is", null);
      if (data.bbox) {
        const [w, s, e, n] = data.bbox;
        q = q.gte("lng", w).lte("lng", e).gte("lat", s).lte("lat", n);
      }
      if (data.q) q = q.ilike("display_name", `%${data.q}%`);
      return q.limit(limit);
    };

    const [vRes, dRes, bRes] = await Promise.all([
      wantVideos ? buildVideos() : Promise.resolve({ data: [], error: null } as any),
      wantDeals ? buildDeals() : Promise.resolve({ data: [], error: null } as any),
      wantBusinesses ? buildBusinesses() : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (vRes.error) throw new Error(vRes.error.message);
    if (dRes.error) throw new Error(dRes.error.message);
    if (bRes.error) throw new Error(bRes.error.message);

    const videos: MapVideoPin[] = (vRes.data ?? []).map((v: any) => ({
      id: v.id,
      title: v.title,
      thumbnail_url: v.thumbnail_url,
      lat: v.lat,
      lng: v.lng,
      tags: v.activity_tags ?? null,
      creator_username: v.creator?.username ?? null,
    }));

    const deals: MapDealPin[] = (dRes.data ?? []).map((d: any) => ({
      id: d.id,
      title: d.title,
      image_url: d.image_url,
      discount_label: d.discount_label,
      lat: d.lat,
      lng: d.lng,
      category: (d.category ?? "other") as DealCategory,
      business_id: d.business_id ?? null,
    }));

    const dealBizIds = new Set(deals.map((d) => d.business_id).filter(Boolean) as string[]);
    const businesses: MapBusinessPin[] = (bRes.data ?? [])
      .filter((b: any) => !dealBizIds.has(b.id))
      .map((b: any) => ({
        id: b.id,
        display_name: b.display_name,
        username: b.username,
        avatar_url: b.avatar_url,
        lat: b.lat,
        lng: b.lng,
        place_name: b.place_name,
      }));

    return { videos, deals, businesses };
  });

// ---------- Geocoding (Mapbox) ----------
const MAPBOX_PUBLIC_TOKEN =
  "pk.eyJ1IjoiYm1jZ3VpZ2FuOTM5IiwiYSI6ImNtcDhhZGswdDBhNWYyc3NjdngycDAxZ28ifQ.X9A6bOGFB5bz6xljmJBwQg";

const geocodeInput = z.object({
  q: z.string().trim().min(1).max(120),
  proximity: z.tuple([z.number(), z.number()]).optional(),
});

export type GeocodeResult = {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
  bbox?: [number, number, number, number];
};

export const geocodePlace = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => geocodeInput.parse(i))
  .handler(async ({ data }) => {
    const token = process.env.MAPBOX_TOKEN || MAPBOX_PUBLIC_TOKEN;
    const params = new URLSearchParams({
      access_token: token,
      limit: "6",
      types: "country,region,place,locality,neighborhood,address,poi",
      autocomplete: "true",
    });
    if (data.proximity) params.set("proximity", `${data.proximity[0]},${data.proximity[1]}`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      data.q,
    )}.json?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
    const json: any = await res.json();
    const results: GeocodeResult[] = (json.features ?? []).map((f: any) => ({
      id: f.id,
      place_name: f.place_name,
      text: f.text,
      center: f.center as [number, number],
      bbox: f.bbox as [number, number, number, number] | undefined,
    }));
    return { results };
  });

// ---------- Cluster detail ----------
const clusterInput = z.object({
  ids: z.object({
    deal_ids: z.array(z.string().uuid()).max(50).default([]),
    video_ids: z.array(z.string().uuid()).max(50).default([]),
    business_ids: z.array(z.string().uuid()).max(50).default([]),
  }),
});

export const getClusterDetail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => clusterInput.parse(i))
  .handler(async ({ data }) => {
    const { deal_ids, video_ids, business_ids } = data.ids;
    const [deals, videos, businesses] = await Promise.all([
      deal_ids.length
        ? supabaseAdmin
            .from("deals")
            .select("id,title,description,image_url,discount_label,category,business_id,price_cents,currency")
            .in("id", deal_ids)
        : Promise.resolve({ data: [], error: null } as any),
      video_ids.length
        ? supabaseAdmin
            .from("videos")
            .select("id,title,thumbnail_url,creator:profiles!videos_creator_id_fkey(username,display_name)")
            .in("id", video_ids)
        : Promise.resolve({ data: [], error: null } as any),
      business_ids.length
        ? supabaseAdmin
            .from("profiles")
            .select("id,display_name,username,avatar_url,bio,place_name")
            .in("id", business_ids)
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    return {
      deals: deals.data ?? [],
      videos: videos.data ?? [],
      businesses: businesses.data ?? [],
    };
  });

// ---------- Save business location ----------
const saveLocInput = z.object({
  lat: z.number().min(-85).max(85),
  lng: z.number().min(-180).max(180),
  address: z.string().trim().max(300).optional(),
  place_name: z.string().trim().max(300).optional(),
});

export const saveBusinessLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => saveLocInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        lat: data.lat,
        lng: data.lng,
        address: data.address ?? null,
        place_name: data.place_name ?? null,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

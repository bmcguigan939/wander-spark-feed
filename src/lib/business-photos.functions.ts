import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const PHOTO_CATEGORIES = [
  "exterior",
  "lobby",
  "dining",
  "pool",
  "view",
  "amenity",
  "location",
  "equipment",
  "group",
  "highlight",
  "other",
] as const;

const photoSchema = z.object({
  url: z.string().url().max(500),
  caption: z.string().max(200).optional().nullable(),
  category: z.enum(PHOTO_CATEGORIES).default("other"),
  sort_order: z.number().int().min(0).max(1000).optional(),
  is_cover: z.boolean().optional(),
});

const MAX_PHOTOS = 50;

/** Public read — anyone can view a business's gallery. */
export const listBusinessPhotos = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ businessId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: photos } = await supabaseAdmin
      .from("business_photos")
      .select("*")
      .eq("business_id", data.businessId)
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    return { photos: photos ?? [] };
  });

/** Owner only — add one photo to their gallery. Enforces the 50-photo soft cap. */
export const addBusinessPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => photoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const businessId = context.userId;
    const { count } = await supabaseAdmin
      .from("business_photos")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);
    if ((count ?? 0) >= MAX_PHOTOS) {
      throw new Error(`Photo limit reached (${MAX_PHOTOS}). Delete one first.`);
    }
    const { data: row, error } = await supabaseAdmin
      .from("business_photos")
      .insert({
        business_id: businessId,
        url: data.url,
        caption: data.caption ?? null,
        category: data.category,
        sort_order: data.sort_order ?? (count ?? 0),
        is_cover: data.is_cover ?? false,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

/** Owner only — update caption/category/order/cover flag. */
export const updateBusinessPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        patch: photoSchema.partial(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("business_photos")
      .update(data.patch)
      .eq("id", data.id)
      .eq("business_id", context.userId);
    if (error) throw new Error(error.message);
    // If this was set as cover, clear the cover flag on any other photo.
    if (data.patch.is_cover === true) {
      await supabaseAdmin
        .from("business_photos")
        .update({ is_cover: false })
        .eq("business_id", context.userId)
        .neq("id", data.id);
    }
    return { ok: true };
  });

export const deleteBusinessPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("business_photos")
      .delete()
      .eq("id", data.id)
      .eq("business_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
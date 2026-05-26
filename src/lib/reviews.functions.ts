import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ALLOWED_TAGS = new Set([
  "matched_video",
  "great_host",
  "would_book_again",
  "great_value",
  "clean",
  "great_location",
]);

const submitSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  matchedVideo: z.boolean().optional(),
  tags: z.array(z.string().refine((t) => ALLOWED_TAGS.has(t))).max(8).optional(),
  comment: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(8).optional(),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id,user_id,deal_id,business_id,creator_id,referrer_video_id,status,completed_at,travel_date")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!booking) throw new Error("Booking not found");
    if (booking.user_id !== userId) throw new Error("Not your booking");
    const completed =
      booking.completed_at != null ||
      (booking.travel_date != null && new Date(booking.travel_date) < new Date());
    if (!completed) throw new Error("Your trip hasn't completed yet — you'll be able to review after the travel date.");
    if (!["confirmed", "paid", "completed"].includes(booking.status)) {
      throw new Error("Only confirmed bookings can be reviewed.");
    }

    const row = {
      booking_id: booking.id,
      deal_id: booking.deal_id,
      business_id: booking.business_id,
      user_id: userId,
      creator_id: booking.creator_id,
      referrer_video_id: booking.referrer_video_id,
      rating: data.rating,
      matched_video: data.matchedVideo ?? null,
      tags: data.tags ?? [],
      comment: data.comment ?? null,
      photos: data.photos ?? [],
    };

    // Upsert — idempotent on booking_id (unique). Within 72h the user can edit.
    const { data: existing } = await supabaseAdmin
      .from("booking_reviews")
      .select("id,created_at,user_id")
      .eq("booking_id", booking.id)
      .maybeSingle();

    if (existing) {
      if (existing.user_id !== userId) throw new Error("Not your review");
      const ageMs = Date.now() - new Date(existing.created_at).getTime();
      if (ageMs > 72 * 3600 * 1000) {
        throw new Error("Reviews can't be edited after 72 hours.");
      }
      const { error } = await supabaseAdmin
        .from("booking_reviews")
        .update({
          rating: row.rating,
          matched_video: row.matched_video,
          tags: row.tags,
          comment: row.comment,
          photos: row.photos,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, reviewId: existing.id, updated: true };
    }

    const { data: ins, error } = await supabaseAdmin
      .from("booking_reviews")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, reviewId: ins.id, updated: false };
  });

export const getPendingReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ bookingId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select(
        "id,user_id,deal_id,business_id,creator_id,travel_date,completed_at,status,deal:deals(title,image_url),business:profiles!bookings_business_id_fkey(username,business_name,display_name),creator:profiles!bookings_creator_id_fkey(username,display_name,avatar_url)",
      )
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || booking.user_id !== userId) {
      throw new Error("Booking not found");
    }
    const { data: existing } = await supabaseAdmin
      .from("booking_reviews")
      .select("id,rating,matched_video,tags,comment,photos,created_at")
      .eq("booking_id", booking.id)
      .maybeSingle();
    return { booking, existing };
  });

export const listMyPendingReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select(
        "id,travel_date,deal:deals(title,image_url),business:profiles!bookings_business_id_fkey(business_name,display_name,username)",
      )
      .eq("user_id", userId)
      .in("status", ["confirmed", "paid", "completed"])
      .lte("travel_date", today)
      .order("travel_date", { ascending: false })
      .limit(20);
    const ids = (bookings ?? []).map((b: any) => b.id);
    if (ids.length === 0) return { pending: [] };
    const { data: reviewed } = await supabaseAdmin
      .from("booking_reviews")
      .select("booking_id")
      .in("booking_id", ids);
    const done = new Set((reviewed ?? []).map((r: any) => r.booking_id));
    return { pending: (bookings ?? []).filter((b: any) => !done.has(b.id)) };
  });

export const getReviewsForDeal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ dealId: z.string().uuid(), limit: z.number().int().min(1).max(50).default(10) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("booking_reviews")
      .select("id,rating,matched_video,tags,comment,photos,created_at,user:profiles!booking_reviews_user_id_fkey(display_name,username,avatar_url)")
      .eq("deal_id", data.dealId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    const { data: agg } = await supabaseAdmin
      .from("deals")
      .select("deal_rating_avg,deal_rating_count")
      .eq("id", data.dealId)
      .maybeSingle();
    return { reviews: rows ?? [], avg: agg?.deal_rating_avg ?? null, count: agg?.deal_rating_count ?? 0 };
  });

export const getReviewsForBusiness = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ businessId: z.string().uuid(), limit: z.number().int().min(1).max(50).default(10) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("booking_reviews")
      .select("id,rating,tags,comment,created_at,deal:deals(title),user:profiles!booking_reviews_user_id_fkey(display_name,username,avatar_url)")
      .eq("business_id", data.businessId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    const { data: agg } = await supabaseAdmin
      .from("profiles")
      .select("business_rating_avg,business_rating_count")
      .eq("id", data.businessId)
      .maybeSingle();
    // Rating distribution (5..1)
    const { data: dist } = await supabaseAdmin
      .from("booking_reviews")
      .select("rating")
      .eq("business_id", data.businessId)
      .eq("status", "published");
    const buckets = [0, 0, 0, 0, 0];
    for (const r of dist ?? []) {
      const n = (r as any).rating as number;
      if (n >= 1 && n <= 5) buckets[5 - n] += 1;
    }
    return {
      reviews: rows ?? [],
      avg: agg?.business_rating_avg ?? null,
      count: agg?.business_rating_count ?? 0,
      distribution: buckets, // index 0 = 5★, 4 = 1★
    };
  });

export const flagReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ reviewId: z.string().uuid(), reason: z.string().min(2).max(500) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("booking_reviews")
      .update({ status: "flagged" })
      .eq("id", data.reviewId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
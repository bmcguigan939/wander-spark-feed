import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

const DEMO_USERS = [
  { email: "demo.creator1@travidz.test", role: "creator", display: "Maya Voyage", username: "mayavoyage" },
  { email: "demo.creator2@travidz.test", role: "creator", display: "Leo Wanders", username: "leowanders" },
  { email: "demo.creator3@travidz.test", role: "creator", display: "Aria Atlas", username: "ariaatlas" },
  { email: "demo.business1@travidz.test", role: "business", display: "Casa Luminosa Lisbon", username: "casaluminosa" },
  { email: "demo.business2@travidz.test", role: "business", display: "Ubud Jungle Retreat", username: "ubudjungle" },
  { email: "demo.business3@travidz.test", role: "business", display: "Reykjavik Aurora Lodge", username: "auroralodge" },
] as const;

const DEMO_DEALS = [
  { biz: 0, title: "Casa Luminosa — Riverside Suite", city: "Lisbon", country: "Portugal", price: 18900, currency: "EUR", lat: 38.7223, lng: -9.1393, image: "https://images.unsplash.com/photo-1513735492246-483525079686?w=800" },
  { biz: 0, title: "Casa Luminosa — Rooftop Studio", city: "Lisbon", country: "Portugal", price: 14500, currency: "EUR", lat: 38.7167, lng: -9.139, image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800" },
  { biz: 1, title: "Ubud Jungle Bungalow", city: "Ubud", country: "Indonesia", price: 9500, currency: "USD", lat: -8.5069, lng: 115.2625, image: "https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=800" },
  { biz: 1, title: "Ubud Canopy Villa with pool", city: "Ubud", country: "Indonesia", price: 22500, currency: "USD", lat: -8.51, lng: 115.27, image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800" },
  { biz: 2, title: "Aurora Lodge — Glass Cabin", city: "Reykjavik", country: "Iceland", price: 31000, currency: "EUR", lat: 64.1466, lng: -21.9426, image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800" },
  { biz: 2, title: "Aurora Lodge — Hot Spring Suite", city: "Reykjavik", country: "Iceland", price: 27500, currency: "EUR", lat: 64.14, lng: -21.94, image: "https://images.unsplash.com/photo-1517825738774-7de9363ef735?w=800" },
  { biz: 0, title: "Sintra Day Trip from Lisbon", city: "Sintra", country: "Portugal", price: 4500, currency: "EUR", lat: 38.8029, lng: -9.3817, image: "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?w=800" },
  { biz: 1, title: "Bali Sunrise Volcano Trek", city: "Kintamani", country: "Indonesia", price: 5500, currency: "USD", lat: -8.2542, lng: 115.3753, image: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800" },
];

/** Idempotent seed — creates demo users via auth admin API, then deals + videos. */
export const seedDemoContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const createdUsers: Array<{ email: string; password: string | null; userId: string; created: boolean }> = [];
    const userIds: string[] = [];
    for (const u of DEMO_USERS) {
      // Check if exists
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", u.username)
        .maybeSingle();
      if (existing) {
        userIds.push(existing.id);
        createdUsers.push({ email: u.email, password: null, userId: existing.id, created: false });
        continue;
      }
      const password = `Demo!${crypto.randomUUID().slice(0, 12)}`;
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password,
        email_confirm: true,
        user_metadata: { display_name: u.display, username: u.username },
      });
      if (error || !created.user) {
        throw new Error(`Failed to create ${u.email}: ${error?.message}`);
      }
      const uid = created.user.id;
      userIds.push(uid);
      await supabaseAdmin.from("profiles").upsert({
        id: uid,
        username: u.username,
        display_name: u.display,
      });
      await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: u.role });
      createdUsers.push({ email: u.email, password, userId: uid, created: true });
    }

    const creatorIds = userIds.slice(0, 3);
    const businessIds = userIds.slice(3, 6);

    // Insert deals tagged source='demo_seed'
    let dealsInserted = 0;
    const dealIdByIdx: string[] = [];
    for (const d of DEMO_DEALS) {
      const { data: existingDeal } = await supabaseAdmin
        .from("deals")
        .select("id")
        .eq("title", d.title)
        .eq("source", "demo_seed")
        .maybeSingle();
      if (existingDeal) {
        dealIdByIdx.push(existingDeal.id);
        continue;
      }
      const { data: row, error } = await supabaseAdmin
        .from("deals")
        .insert({
          business_id: businessIds[d.biz],
          title: d.title,
          description: `${d.title} — seeded demo listing.`,
          url: `https://example.com/book/${d.title.toLowerCase().replace(/\W+/g, "-")}`,
          image_url: d.image,
          city: d.city,
          country: d.country,
          destination: `${d.city}, ${d.country}`,
          price_cents: d.price,
          currency: d.currency,
          lat: d.lat,
          lng: d.lng,
          source: "demo_seed",
          status: "approved",
          is_active: true,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Deal insert failed: ${error.message}`);
      dealIdByIdx.push(row.id);
      dealsInserted++;
    }

    // Seed videos — one per deal, distributed across creators
    let videosInserted = 0;
    const sampleMuxIds = [
      "VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU",
      "DS00Spx1CV902MCtPRAhxNRyWeC01CZyuRf",
      "5PuyFNRZS00jc4dB7DkVk00gC9eEFNRSDeMJ",
    ];
    for (let i = 0; i < DEMO_DEALS.length; i++) {
      const creator = creatorIds[i % 3];
      const muxId = sampleMuxIds[i % sampleMuxIds.length];
      const { data: existingVid } = await supabaseAdmin
        .from("videos")
        .select("id")
        .eq("creator_id", creator)
        .eq("caption", `Demo: ${DEMO_DEALS[i].title}`)
        .maybeSingle();
      if (existingVid) continue;
      await supabaseAdmin.from("videos").insert({
        creator_id: creator,
        caption: `Demo: ${DEMO_DEALS[i].title}`,
        mux_playback_id: muxId,
        thumbnail_url: DEMO_DEALS[i].image,
        destination: DEMO_DEALS[i].city,
        country: DEMO_DEALS[i].country,
        is_demo: true,
        status: "ready",
      });
      videosInserted++;
    }

    return {
      ok: true,
      users: createdUsers,
      dealsInserted,
      videosInserted,
      totalUsers: userIds.length,
    };
  });

export const resetDemoContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { count: dealsDeleted } = await supabaseAdmin
      .from("deals")
      .delete({ count: "exact" })
      .eq("source", "demo_seed");
    const { count: videosDeleted } = await supabaseAdmin
      .from("videos")
      .delete({ count: "exact" })
      .eq("is_demo", true);
    return { ok: true, dealsDeleted: dealsDeleted ?? 0, videosDeleted: videosDeleted ?? 0 };
  });
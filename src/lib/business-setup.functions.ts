import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// One server fn per "save" so each step has a tight Zod schema and writes
// only the columns it owns. Resume is driven by setup_step_completed.

const setupSelect =
  "id,setup_business_type,activity_category,activity_format,activity_meeting_point,setup_property_kind,setup_unit_count,setup_units_same_address,setup_step_completed,setup_completed_at,ota_listings,channel_manager_planned,channel_manager_provider,channel_manager_provider_other,channel_manager_connect_skipped_at,facilities,breakfast_offered,parking_offered,languages_spoken,neighbourhood_blurb,default_booking_model,pay_at_property_enabled,long_stays_enabled,legal_entity_type,legal_entity_name,legal_contact_email,legal_contact_phone,display_name,bio,address,place_name,lat,lng,business_name,business_website_url,business_country,business_city,business_agreement_accepted_at,stripe_connect_payouts_enabled,stripe_connect_charges_enabled,payout_method";

export const getMySetupState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select(setupSelect)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { data: firstDeal } = await supabaseAdmin
      .from("deals")
      .select(
        "id,title,description,image_url,price_cents,currency,is_active,status,cancellation_policy_code,booking_model,category,price_unit"
      )
      .eq("business_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return { profile, firstDeal };
  });

// Step 0: business type (stay vs activity)
export const saveSetupBusinessType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ setup_business_type: z.enum(["stay", "activity"]) })
      .parse(i)
  )
  .handler(async ({ data, context }) => {
    // If the user is switching paths, reset the step counter so the new
    // path's Step 1 is the resume point instead of stranding them deep in
    // the old path's numbering.
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("setup_business_type,setup_step_completed")
      .eq("id", context.userId)
      .maybeSingle();
    const prev = (existing as any)?.setup_business_type as
      | "stay"
      | "activity"
      | null
      | undefined;
    const changed = !!prev && prev !== data.setup_business_type;
    if (changed) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          setup_business_type: data.setup_business_type,
          setup_step_completed: 0,
        })
        .eq("id", context.userId);
      if (error) throw new Error(error.message);
      return { ok: true, step: 0 };
    }
    return bumpStep(context.userId, 0, {
      setup_business_type: data.setup_business_type,
    });
  });

// Activity Step A: category + format
export const saveSetupActivityBasics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        activity_category: z.enum([
          "tour",
          "experience",
          "class",
          "rental",
          "food_drink",
          "wellness",
          "attraction",
          "transport",
          "other",
        ]),
        activity_format: z.enum(["group", "private", "self_guided", "ticket"]),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) => bumpStep(context.userId, 1, { ...data }));

// Activity Step B: meeting point (extends address save)
export const saveSetupActivityLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        address: z.string().min(2).max(300),
        place_name: z.string().max(200).optional().nullable(),
        business_city: z.string().max(120).optional().nullable(),
        business_country: z.string().max(120).optional().nullable(),
        lat: z.number().min(-90).max(90).optional().nullable(),
        lng: z.number().min(-180).max(180).optional().nullable(),
        activity_meeting_point: z.string().max(400).optional().nullable(),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) => bumpStep(context.userId, 2, { ...data }));

// Activity Step pricing (per-person price + cancellation, no long-stays)
export const saveSetupActivityPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        dealId: z.string().uuid(),
        price_cents: z.number().int().min(0).max(10_000_000),
        currency: z.string().length(3),
        price_unit: z.enum(["per_person", "per_group", "flat"]),
        cancellation_policy_code: z.enum([
          "travidz_standard",
          "free_cancel_until_start",
          "non_refundable",
          "custom_24h",
          "custom_7d",
        ]),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("deals")
      .update({
        price_cents: data.price_cents,
        currency: data.currency,
        price_unit: data.price_unit,
        cancellation_policy_code: data.cancellation_policy_code,
      })
      .eq("id", data.dealId)
      .eq("business_id", context.userId);
    if (error) throw new Error(error.message);
    return bumpStep(context.userId, 8, {});
  });

async function bumpStep(userId: string, step: number, patch: Record<string, unknown>) {
  // Only ratchet step forward — don't move it back if the user revisits an
  // earlier step and saves a change.
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("setup_step_completed")
    .eq("id", userId)
    .maybeSingle();
  const current = (existing as any)?.setup_step_completed ?? 0;
  const nextStep = Math.max(current, step);
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ ...patch, setup_step_completed: nextStep })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return { ok: true, step: nextStep };
}

// Step 1: property type
export const saveSetupPropertyType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        setup_property_kind: z.enum(["apartment", "home", "hotel", "alternative"]),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) =>
    bumpStep(context.userId, 1, { setup_property_kind: data.setup_property_kind })
  );

// Step 2: count & layout
export const saveSetupCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        setup_unit_count: z.number().int().min(1).max(500),
        setup_units_same_address: z.boolean().nullable().optional(),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) =>
    bumpStep(context.userId, 2, {
      setup_unit_count: data.setup_unit_count,
      setup_units_same_address: data.setup_units_same_address ?? null,
    })
  );

// Step 3: OTA listings
const otaSourceEnum = z.enum([
  "airbnb",
  "vrbo",
  "expedia",
  "hotels_com",
  "tripadvisor",
  "booking_com",
  "other",
]);
export const saveSetupOtaListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        ota_listings: z
          .array(
            z.object({
              source: otaSourceEnum,
              url: z.string().url().max(500).optional().or(z.literal("")),
            })
          )
          .max(10),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) =>
    bumpStep(context.userId, 3, { ota_listings: data.ota_listings })
  );

// Step 4: address
export const saveSetupAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        address: z.string().min(2).max(300),
        place_name: z.string().max(200).optional().nullable(),
        business_city: z.string().max(120).optional().nullable(),
        business_country: z.string().max(120).optional().nullable(),
        lat: z.number().min(-90).max(90).optional().nullable(),
        lng: z.number().min(-180).max(180).optional().nullable(),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) => bumpStep(context.userId, 4, { ...data }));

// Step 5: channel manager intent
export const saveSetupChannelManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        channel_manager_planned: z.boolean(),
        provider: z.string().trim().max(60).optional().nullable(),
        provider_other: z.string().trim().max(120).optional().nullable(),
        skipped: z.boolean().optional(),
        feeds: z
          .array(
            z.object({
              label: z.string().trim().max(80).optional().nullable(),
              feed_url: z
                .string()
                .trim()
                .min(5)
                .max(500)
                .refine(
                  (v) => /^(https?:|webcal:)\/\//i.test(v),
                  "Feed URL must start with https://, http:// or webcal://",
                ),
            }),
          )
          .max(10)
          .optional(),
        /** when true, advance to the next wizard step; when false, stay on step 5 */
        advance: z.boolean().optional(),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const patch: Record<string, unknown> = {
      channel_manager_planned: data.channel_manager_planned,
    };
    if (data.provider !== undefined) patch.channel_manager_provider = data.provider || null;
    if (data.provider_other !== undefined)
      patch.channel_manager_provider_other = data.provider_other || null;
    if (data.skipped) patch.channel_manager_connect_skipped_at = new Date().toISOString();

    if (data.feeds) {
      const { error: delErr } = await supabaseAdmin
        .from("business_channel_feeds")
        .delete()
        .eq("business_id", userId);
      if (delErr) throw new Error(delErr.message);
      const rows = data.feeds
        .filter((f) => f.feed_url.trim().length > 0)
        .map((f) => ({
          business_id: userId,
          feed_url: f.feed_url.trim(),
          label: f.label?.trim() || null,
        }));
      if (rows.length) {
        const { data: inserted, error: insErr } = await supabaseAdmin
          .from("business_channel_feeds")
          .insert(rows)
          .select("id");
        if (insErr) throw new Error(insErr.message);
        // Sync each inserted feed immediately so the user sees results
        // without waiting for the hourly cron. Failures don't block the wizard.
        try {
          const { syncBusinessFeed } = await import(
            "@/lib/calendar-sync.server"
          );
          for (const r of inserted ?? []) {
            await syncBusinessFeed(r.id as string);
          }
        } catch (e) {
          console.error("[setup] immediate channel feed sync failed", e);
        }
      }
    }

    const advance = data.advance ?? data.channel_manager_planned === false;
    if (advance) {
      return bumpStep(userId, 5, patch);
    }
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(patch as any)
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, step: null as number | null };
  });

export const getMyChannelFeeds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("business_channel_feeds")
      .select("id,label,feed_url,created_at")
      .eq("business_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { feeds: data ?? [] };
  });

// (Step 5 legacy alias kept above; nothing else changes.)

// Step 6: facilities
export const saveSetupFacilities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        facilities: z.array(z.string().min(1).max(60)).max(60),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) =>
    bumpStep(context.userId, 6, { facilities: data.facilities })
  );

// Step 7: services
export const saveSetupServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        breakfast_offered: z.enum(["no", "yes_free", "yes_paid"]),
        parking_offered: z.enum(["no", "yes_free", "yes_paid"]),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) => bumpStep(context.userId, 7, { ...data }));

// Step 8: languages
export const saveSetupLanguages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ languages_spoken: z.array(z.string().min(2).max(40)).max(30) })
      .parse(i)
  )
  .handler(async ({ data, context }) =>
    bumpStep(context.userId, 8, { languages_spoken: data.languages_spoken })
  );

// Step 9: host profile
export const saveSetupHostProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        display_name: z.string().min(1).max(80),
        bio: z.string().max(1200).optional().nullable(),
        neighbourhood_blurb: z.string().max(1200).optional().nullable(),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) => bumpStep(context.userId, 9, { ...data }));

// Step 10: booking model
export const saveSetupBookingModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ default_booking_model: z.enum(["instant", "request"]) }).parse(i)
  )
  .handler(async ({ data, context }) =>
    bumpStep(context.userId, 10, {
      default_booking_model: data.default_booking_model,
    })
  );

// Step 11: payments preference (Stripe Connect onboarding is separate)
export const saveSetupPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ pay_at_property_enabled: z.boolean() }).parse(i)
  )
  .handler(async ({ data, context }) =>
    bumpStep(context.userId, 11, {
      pay_at_property_enabled: data.pay_at_property_enabled,
    })
  );

// Steps 12 (first unit) and 13 (photos) advance the step pointer only;
// the actual data is saved by DealForm / RoomsAndRatesEditor / BusinessPhotosEditor.
export const markSetupStepComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ step: z.number().int().min(1).max(16) }).parse(i)
  )
  .handler(async ({ data, context }) => bumpStep(context.userId, data.step, {}));

// Step 14: pricing & policies (applies to the first deal)
export const saveSetupPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        dealId: z.string().uuid(),
        price_cents: z.number().int().min(0).max(10_000_000),
        currency: z.string().length(3),
        cancellation_policy_code: z.enum([
          "travidz_standard",
          "free_cancel_until_start",
          "non_refundable",
          "custom_24h",
          "custom_7d",
        ]),
        long_stays_enabled: z.boolean(),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("deals")
      .update({
        price_cents: data.price_cents,
        currency: data.currency,
        cancellation_policy_code: data.cancellation_policy_code,
      })
      .eq("id", data.dealId)
      .eq("business_id", context.userId);
    if (error) throw new Error(error.message);
    return bumpStep(context.userId, 14, {
      long_stays_enabled: data.long_stays_enabled,
    });
  });

// Step 15: legal entity
export const saveSetupLegalEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        legal_entity_type: z.enum(["individual", "business"]),
        legal_entity_name: z.string().max(160).optional().nullable(),
        legal_contact_email: z.string().email().max(200).optional().nullable(),
        legal_contact_phone: z.string().max(40).optional().nullable(),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) => bumpStep(context.userId, 15, { ...data }));

// Step 16: go live — optionally activate the first deal
export const completeSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        activateFirstDeal: z.boolean(),
        dealId: z.string().uuid().optional(),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) => {
    if (data.activateFirstDeal && data.dealId) {
      await supabaseAdmin
        .from("deals")
        .update({ is_active: true, status: "approved" })
        .eq("id", data.dealId)
        .eq("business_id", context.userId);
    }
    return bumpStep(context.userId, 16, { setup_completed_at: new Date().toISOString() });
  });

// Create the first deal stub so steps 12-14 have something to attach to.
export const ensureFirstDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: existing } = await supabaseAdmin
      .from("deals")
      .select("id")
      .eq("business_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existing) return { id: (existing as any).id };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select(
        "display_name,business_name,business_city,business_country,address,lat,lng,setup_property_kind,setup_business_type,activity_category,default_booking_model"
      )
      .eq("id", userId)
      .maybeSingle();
    const p: any = profile ?? {};
    const isActivity = p.setup_business_type === "activity";
    const category = isActivity
      ? p.activity_category === "tour"
        ? "tour"
        : "do"
      : p.setup_property_kind === "hotel" ||
          p.setup_property_kind === "apartment" ||
          p.setup_property_kind === "home" ||
          p.setup_property_kind === "alternative"
        ? "stay"
        : "other";
    const price_unit = isActivity ? "per_person" : "per_night";
    const title = p.business_name || p.display_name || "My listing";
    const { data: row, error } = await supabaseAdmin
      .from("deals")
      .insert({
        business_id: userId,
        title,
        description: null,
        city: p.business_city,
        country: p.business_country,
        destination: [p.business_city, p.business_country].filter(Boolean).join(", ") || null,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        category,
        bookable: true,
        is_active: false,
        status: "draft",
        booking_model: p.default_booking_model ?? "instant",
        currency: "GBP",
        price_unit,
        url: "https://travidz.com/",
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type BookableGate = "website" | "photos" | "items" | "rates" | "calendar" | "payouts";

export type AccountKind = "stay" | "activity" | "unknown";

export type BookableStatus = {
  bookable: boolean;
  missing: BookableGate[];
  accountKind: AccountKind;
};

function deriveAccountKind(
  deals: Array<{ category: string | null }>,
): AccountKind {
  if (deals.some((d) => d.category === "stay")) return "stay";
  if (deals.some((d) => d.category === "do" || d.category === "tour")) {
    return "activity";
  }
  return "unknown";
}

/**
 * Single source of truth for "is this business bookable on Travidz?".
 * Mirrors Booking.com's listing-ready model. A business is bookable
 * only when ALL five gates are green:
 *   - photos:  ≥3 property/operator gallery photos
 *   - items:   ≥1 active room/activity option, each with ≥1 photo,
 *              attached to an active approved deal owned by the business
 *   - rates:   ≥1 active rate plan attached to one of those items
 *   - calendar: iCal sync row OR ≥1 native time-slot for activities
 *   - payouts: Stripe Connect onboarded — charges AND payouts enabled
 *
 * Used by feed, profile, deal page, search, map, admin — anything that
 * decides whether to show a Book CTA or any outbound link to the business.
 */
export const getBookableStatus = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ businessId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<BookableStatus> => {
    const businessId = data.businessId;
    const missing: BookableGate[] = [];

    // Run all checks in parallel
    const [
      photosRes,
      dealsRes,
      payoutRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("business_photos")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
      supabaseAdmin
        .from("deals")
        .select("id,category")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .eq("status", "approved"),
      supabaseAdmin
        .from("profiles")
        .select("stripe_connect_payouts_enabled,stripe_connect_charges_enabled,business_website_url")
        .eq("id", businessId)
        .maybeSingle(),
    ]);

    // 1) Photos
    if ((photosRes.count ?? 0) < 3) missing.push("photos");

    const dealRows = (dealsRes.data ?? []) as Array<{ id: string; category: string | null }>;
    const dealIds = dealRows.map((d) => d.id);
    const accountKind = deriveAccountKind(dealRows);

    // 0) Website URL — required ONLY for activity operators, so the
    //    price-match scanner can exclude their own site from competitor
    //    scrapes. Stays/hotels don't need this and never see the gate.
    if (accountKind === "activity") {
      const p = payoutRes.data as any;
      if (!p?.business_website_url) missing.push("website");
    }

    if (dealIds.length === 0) {
      // No active deal → no items, no rates, no calendar
      missing.push("items", "rates", "calendar");
    } else {
      const [roomsRes, ratesRes, icalRes, slotsRes] = await Promise.all([
        supabaseAdmin
          .from("deal_rooms")
          .select("id,photos")
          .in("deal_id", dealIds)
          .eq("is_active", true),
        supabaseAdmin
          .from("deal_rate_plans")
          .select("id", { count: "exact", head: true })
          .in("deal_id", dealIds)
          .eq("is_active", true),
        supabaseAdmin
          .from("deal_external_calendars")
          .select("id", { count: "exact", head: true })
          .in("deal_id", dealIds),
        supabaseAdmin
          .from("deal_time_slots")
          .select("id", { count: "exact", head: true })
          .in("deal_id", dealIds)
          .eq("is_active", true),
      ]);

      const rooms = (roomsRes.data ?? []) as Array<{ id: string; photos: any }>;
      const roomsWithPhotos = rooms.filter((r) => {
        const p = r.photos;
        return Array.isArray(p) && p.length > 0;
      });
      if (roomsWithPhotos.length === 0) missing.push("items");

      if ((ratesRes.count ?? 0) === 0) missing.push("rates");

      if ((icalRes.count ?? 0) === 0 && (slotsRes.count ?? 0) === 0) {
        missing.push("calendar");
      }
    }

    // 5) Payouts — Stripe Connect onboarding must be complete.
    const p = payoutRes.data as any;
    const payoutsReady =
      p?.stripe_connect_payouts_enabled === true &&
      p?.stripe_connect_charges_enabled === true;
    if (!payoutsReady) missing.push("payouts");

    return { bookable: missing.length === 0, missing, accountKind };
  });

/**
 * Server-internal version of the same check — for use inside other server
 * functions (feed enrichment, deal page loaders) without paying the RPC
 * boundary cost. Same logic, same return shape.
 */
export async function computeBookableStatus(
  businessId: string,
): Promise<BookableStatus> {
  const missing: BookableGate[] = [];

  const [photosRes, dealsRes, payoutRes] = await Promise.all([
    supabaseAdmin
      .from("business_photos")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId),
    supabaseAdmin
      .from("deals")
      .select("id,category")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .eq("status", "approved"),
    supabaseAdmin
      .from("profiles")
      .select("stripe_connect_payouts_enabled,stripe_connect_charges_enabled,business_website_url")
      .eq("id", businessId)
      .maybeSingle(),
  ]);

  {
    const p = payoutRes.data as any;
    if (!p?.business_website_url) missing.push("website");
  }
  if ((photosRes.count ?? 0) < 3) missing.push("photos");

  const dealRows = (dealsRes.data ?? []) as Array<{ id: string; category: string | null }>;
  const dealIds = dealRows.map((d) => d.id);
  const accountKind = deriveAccountKind(dealRows);
  if (dealIds.length === 0) {
    missing.push("items", "rates", "calendar");
  } else {
    const [roomsRes, ratesRes, icalRes, slotsRes] = await Promise.all([
      supabaseAdmin
        .from("deal_rooms")
        .select("id,photos")
        .in("deal_id", dealIds)
        .eq("is_active", true),
      supabaseAdmin
        .from("deal_rate_plans")
        .select("id", { count: "exact", head: true })
        .in("deal_id", dealIds)
        .eq("is_active", true),
      supabaseAdmin
        .from("deal_external_calendars")
        .select("id", { count: "exact", head: true })
        .in("deal_id", dealIds),
      supabaseAdmin
        .from("deal_time_slots")
        .select("id", { count: "exact", head: true })
        .in("deal_id", dealIds)
        .eq("is_active", true),
    ]);
    const rooms = (roomsRes.data ?? []) as Array<{ id: string; photos: any }>;
    if (rooms.filter((r) => Array.isArray(r.photos) && r.photos.length > 0).length === 0) {
      missing.push("items");
    }
    if ((ratesRes.count ?? 0) === 0) missing.push("rates");
    if ((icalRes.count ?? 0) === 0 && (slotsRes.count ?? 0) === 0) {
      missing.push("calendar");
    }
  }

  {
    const p = payoutRes.data as any;
    const payoutsReady =
      p?.stripe_connect_payouts_enabled === true &&
      p?.stripe_connect_charges_enabled === true;
    if (!payoutsReady) missing.push("payouts");
  }

  return { bookable: missing.length === 0, missing, accountKind };
}

export const GATE_LABELS: Record<BookableGate, string> = {
  website: "Add your business website",
  photos: "Add property photos",
  items: "Add rooms / activity options",
  rates: "Set prices",
  calendar: "Connect your calendar",
  payouts: "Set up payouts",
};

export const GATE_LINKS: Record<BookableGate, string> = {
  website: "/business/onboarding/website",
  photos: "/business",
  items: "/business",
  rates: "/business",
  calendar: "/business",
  payouts: "/business/onboarding/payout",
};

/**
 * Lightweight lookup used by the dashboard checklist to deep-link each gate
 * to the most useful page + scroll anchor. Defaults gracefully when no deal
 * exists yet (operator hasn't created their first listing).
 */
export function gateLinkFor(
  gate: BookableGate,
  firstDealId: string | null,
): string {
  switch (gate) {
    case "website":
      return "/business/onboarding/website";
    case "photos":
      return "/business#photos";
    case "items":
      return firstDealId
        ? `/business/deals/${firstDealId}/edit#rooms`
        : "/business/deals/new";
    case "rates":
      return firstDealId
        ? `/business/deals/${firstDealId}/edit#rates`
        : "/business/deals/new";
    case "calendar":
      return firstDealId
        ? `/business/deals/${firstDealId}/edit#calendar`
        : "/business/deals/new";
    case "payouts":
      return "/business/onboarding/payout";
  }
}
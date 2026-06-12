import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { setResponseHeaders } from "@tanstack/react-start/server";

// Public, edge-cached: pulls everything the Booking.com-style page needs in
// one round trip (deal + extended business profile + photos). Safe to cache —
// everything returned is already public.
const CACHE = "public, s-maxage=60, stale-while-revalidate=600";

export const getBookablePropertyDetails = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ dealId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    setResponseHeaders(new Headers({ "Cache-Control": CACHE }));
    const { data: deal, error } = await supabaseAdmin
      .from("deals")
      .select(
        "id,title,description,destination,country,city,discount_label,price_cents,currency,image_url,is_active,bookable,status,category,cancellation_policy_code,booking_model,deal_rating_avg,deal_rating_count,business_id,business:profiles!deals_business_id_fkey(id,username,display_name,avatar_url,business_name,business_rating_avg,business_rating_count,bio,neighbourhood_blurb,facilities,languages_spoken,breakfast_offered,parking_offered,pay_at_property_enabled,place_name,address,business_city,business_country)"
      )
      .eq("id", data.dealId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!deal) throw new Error("Deal not found");
    const businessId = (deal as any).business_id as string | null;
    const { data: photos } = businessId
      ? await supabaseAdmin
          .from("business_photos")
          .select("id,url,caption,is_cover,sort_order")
          .eq("business_id", businessId)
          .order("is_cover", { ascending: false })
          .order("sort_order", { ascending: true })
      : ({ data: [] } as any);
    return { deal, photos: photos ?? [] };
  });
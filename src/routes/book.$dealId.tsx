import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { MobileShell } from "@/components/layout/BottomNav";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { getBookablePropertyDetails } from "@/lib/booking-page.functions";
import { createBookingCheckout } from "@/lib/booking.functions";
import { getBlockedDates } from "@/lib/calendar.functions";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft,
  Loader2,
  Minus,
  Plus,
  Star,
  MapPin,
  Wifi,
  Coffee,
  Car,
  ShieldCheck,
  Languages,
  CalendarDays,
  Users,
  X,
  Sparkles,
} from "lucide-react";
import { PriceMatchBadge } from "@/components/PriceMatchBadge";
import { RatingSummary } from "@/components/reviews/RatingSummary";

export const Route = createFileRoute("/book/$dealId")({
  head: () => ({ meta: [{ title: "Book — Travidz" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    v: typeof s.v === "string" ? s.v : undefined,
    rate: typeof s.rate === "string" ? s.rate : undefined,
    room: typeof s.room === "string" ? s.room : undefined,
  }),
  component: BookPage,
});

function BookPage() {
  const { dealId } = Route.useParams();
  const { v: referrerVideoId, rate: ratePlanId, room: roomId } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const fetchDetails = useServerFn(getBookablePropertyDetails);
  const checkoutFn = useServerFn(createBookingCheckout);
  const fetchBlocked = useServerFn(getBlockedDates);

  const [guests, setGuests] = useState(1);
  const [travelDate, setTravelDate] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { redirect: `/book/${dealId}` } as any });
    }
  }, [loading, user, navigate, dealId]);

  const { data, isLoading } = useQuery({
    queryKey: ["bookable-property", dealId],
    queryFn: () => fetchDetails({ data: { dealId } }),
  });
  const deal: any = data?.deal ?? null;
  const photos: any[] = data?.photos ?? [];
  const business: any = deal?.business ?? {};

  const { data: blocked } = useQuery({
    queryKey: ["blocked-dates", dealId],
    queryFn: () => fetchBlocked({ data: { dealId } }),
    enabled: !!deal?.bookable,
    staleTime: 60_000,
  });
  const blockedSet = useMemo(
    () => new Set<string>(blocked?.dates ?? []),
    [blocked],
  );
  const dateBlocked = !!(travelDate && blockedSet.has(travelDate));

  const total = useMemo(() => (deal?.price_cents ?? 0) * guests, [deal, guests]);
  const fmt = (cents: number) =>
    (cents / 100).toLocaleString("en-GB", {
      style: "currency",
      currency: deal?.currency || "GBP",
    });

  const galleryImages = useMemo(() => {
    const urls = photos.map((p) => p.url).filter(Boolean);
    if (urls.length > 0) return urls;
    if (deal?.image_url) return [deal.image_url];
    return [];
  }, [photos, deal]);

  const isRequest = deal?.booking_model === "request";
  const cta = isRequest ? "Request to book" : "Reserve";

  async function startCheckout() {
    setErr(null);
    setOpening(true);
    try {
      const res = await checkoutFn({
        data: {
          dealId,
          ratePlanId,
          roomId,
          guests,
          travelDate: travelDate || undefined,
          returnUrl: `${window.location.origin}/book/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
          referrerVideoId,
        },
      });
      if (res.clientSecret) {
        setClientSecret(res.clientSecret);
      } else {
        // pay_at_property — booking confirmed, no Stripe redirect
        navigate({ to: "/book/return", search: { booking_id: res.bookingId } as any });
      }
    } catch (e: any) {
      setErr(e?.message ?? "Could not start checkout");
    } finally {
      setOpening(false);
    }
  }

  if (!user) return null;

  return (
    <MobileShell>
      <PaymentTestModeBanner />

      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {clientSecret && (
        <div id="checkout" className="px-4 pt-4">
          <Link
            to="/deals/$id"
            params={{ id: dealId }}
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Link>
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}

      {deal && !clientSecret && (
        <div className="pb-32">
          {/* Back nav floats over the gallery */}
          <div className="relative">
            <Link
              to="/deals/$id"
              params={{ id: dealId }}
              className="absolute left-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/85 text-foreground shadow-soft backdrop-blur"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Gallery images={galleryImages} title={deal.title} />
          </div>

          <div className="space-y-6 px-4 pt-4">
            {/* Header */}
            <header>
              {referrerVideoId && (
                <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Sparkles className="h-3 w-3" /> Discovered from a Travidz clip
                </span>
              )}
              <h1 className="font-display text-2xl font-semibold leading-tight">{deal.title}</h1>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {business.place_name ||
                  [deal.city, deal.country].filter(Boolean).join(", ") ||
                  "Location TBD"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <RatingSummary
                  avg={deal.deal_rating_avg}
                  count={deal.deal_rating_count}
                  size="sm"
                />
                {business?.business_rating_count > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                    {Number(business.business_rating_avg).toFixed(1)} host rating
                  </span>
                )}
              </div>
            </header>

            {/* Highlight chips */}
            <HighlightChips deal={deal} business={business} />

            {!deal.bookable && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
                This property isn't bookable through Travidz right now.
              </div>
            )}

            {/* About */}
            {(deal.description || business.bio) && (
              <section>
                <h2 className="text-sm font-semibold">About this place</h2>
                {deal.description && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                    {deal.description}
                  </p>
                )}
                {business.bio && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {business.bio}
                  </p>
                )}
              </section>
            )}

            {business.neighbourhood_blurb && (
              <section>
                <h2 className="text-sm font-semibold">The neighbourhood</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {business.neighbourhood_blurb}
                </p>
              </section>
            )}

            {Array.isArray(business.facilities) && business.facilities.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold">What this place offers</h2>
                <ul className="mt-3 grid grid-cols-2 gap-2">
                  {business.facilities.map((f: string) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 text-xs"
                    >
                      <Wifi className="h-3.5 w-3.5 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="text-sm font-semibold">Choose your room or rate</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Showing {fmt(deal.price_cents ?? 0)} base price × {guests}{" "}
                {guests === 1 ? "guest" : "guests"}.
              </p>
              <div className="mt-3">
                <RateInlineWrapper
                  dealId={dealId}
                  category={deal.category}
                  currency={deal.currency}
                  referrerVideoId={referrerVideoId}
                />
              </div>
            </section>

            {deal.bookable && (
              <PriceMatchBadge
                dealId={dealId}
                roomId={roomId ?? null}
                checkIn={travelDate || null}
                guests={guests}
              />
            )}

            <section className="rounded-2xl border border-border bg-card/40 p-4 text-sm">
              <h2 className="text-sm font-semibold">House rules & policies</h2>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Cancellation:{" "}
                  <span className="text-foreground">
                    {(deal.cancellation_policy_code ?? "travidz_standard").replaceAll("_", " ")}
                  </span>
                </li>
                {business.pay_at_property_enabled && (
                  <li className="flex items-center gap-2">
                    <Coffee className="h-3.5 w-3.5 text-primary" /> Pay-at-property available
                  </li>
                )}
                {Array.isArray(business.languages_spoken) &&
                  business.languages_spoken.length > 0 && (
                    <li className="flex items-center gap-2">
                      <Languages className="h-3.5 w-3.5 text-primary" />
                      Host speaks {business.languages_spoken.join(", ")}
                    </li>
                  )}
              </ul>
            </section>

            <section className="rounded-2xl border border-border bg-card/40 p-4">
              <h2 className="text-sm font-semibold">Meet your host</h2>
              <div className="mt-3 flex items-center gap-3">
                {business.avatar_url ? (
                  <img
                    src={business.avatar_url}
                    alt={business.display_name ?? "Host"}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {(business.business_name ?? business.display_name ?? "H").slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {business.business_name ?? business.display_name ?? "Host"}
                  </p>
                  {business.username && (
                    <p className="text-xs text-muted-foreground">@{business.username}</p>
                  )}
                </div>
              </div>
            </section>

            {err && <p className="text-sm text-destructive">{err}</p>}
          </div>

          {/* Sticky reserve bar */}
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
            <div className="mx-auto flex max-w-lg items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold leading-none">{fmt(total)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {guests} {guests === 1 ? "guest" : "guests"}
                  {travelDate ? ` · ${travelDate}` : ""}
                </p>
              </div>
              <button
                onClick={() => setSheetOpen(true)}
                className="rounded-full border border-border bg-card px-3 py-2 text-xs font-medium"
              >
                {travelDate ? "Edit" : "Choose dates"}
              </button>
              <button
                onClick={startCheckout}
                disabled={
                  opening || !deal.bookable || !deal.price_cents || dateBlocked
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-60"
              >
                {opening && <Loader2 className="h-4 w-4 animate-spin" />}
                {cta}
              </button>
            </div>
          </div>

          {/* Date / guest sheet */}
          {sheetOpen && (
            <DateGuestSheet
              guests={guests}
              setGuests={setGuests}
              travelDate={travelDate}
              setTravelDate={setTravelDate}
              dateBlocked={dateBlocked}
              blockedCount={blockedSet.size}
              onClose={() => setSheetOpen(false)}
            />
          )}
        </div>
      )}
    </MobileShell>
  );
}

// ---------- gallery ----------
function Gallery({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) {
    return (
      <div className="aspect-[4/3] w-full bg-muted">
        <div className="grid h-full place-items-center text-xs text-muted-foreground">
          No photos yet
        </div>
      </div>
    );
  }
  return (
    <div className="relative">
      <div
        className="flex aspect-[4/3] w-full snap-x snap-mandatory overflow-x-auto bg-black"
        onScroll={(e) => {
          const el = e.currentTarget;
          const next = Math.round(el.scrollLeft / el.clientWidth);
          if (next !== idx) setIdx(next);
        }}
      >
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${title} photo ${i + 1}`}
            className="h-full w-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white">
          {idx + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

function HighlightChips({ deal, business }: { deal: any; business: any }) {
  const chips: { icon: any; label: string }[] = [];
  const policy = (deal.cancellation_policy_code as string) ?? "";
  if (policy.startsWith("free_cancel") || policy === "custom_24h" || policy === "custom_7d") {
    chips.push({ icon: ShieldCheck, label: "Free cancellation" });
  }
  if (business.breakfast_offered === "yes_free")
    chips.push({ icon: Coffee, label: "Breakfast included" });
  if (business.parking_offered === "yes_free")
    chips.push({ icon: Car, label: "Free parking" });
  if (business.pay_at_property_enabled)
    chips.push({ icon: ShieldCheck, label: "Pay at property" });
  if (deal.booking_model !== "request")
    chips.push({ icon: Sparkles, label: "Instant book" });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c, i) => {
        const I = c.icon;
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
          >
            <I className="h-3 w-3" /> {c.label}
          </span>
        );
      })}
    </div>
  );
}

// Reusable wrapper so we don't have to import RateSelector at the top of the
// route (it pulls a lot of icons). Kept inline since it's used once.
function RateInlineWrapper(props: {
  dealId: string;
  category?: string;
  currency?: string;
  referrerVideoId?: string;
}) {
  // dynamic import not strictly needed; just delegate
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { RateSelector } = require("@/components/deals/RateSelector");
  return <RateSelector {...props} />;
}

function DateGuestSheet({
  guests,
  setGuests,
  travelDate,
  setTravelDate,
  dateBlocked,
  blockedCount,
  onClose,
}: {
  guests: number;
  setGuests: (n: number) => void;
  travelDate: string;
  setTravelDate: (v: string) => void;
  dateBlocked: boolean;
  blockedCount: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40">
      <div className="w-full rounded-t-3xl bg-background p-5 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Your stay</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              <CalendarDays className="mr-1 inline h-3.5 w-3.5" /> Travel date
            </label>
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            />
            {dateBlocked && (
              <p className="mt-1.5 text-xs text-destructive">
                This date is unavailable — please pick another.
              </p>
            )}
            {blockedCount > 0 && !dateBlocked && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {blockedCount} dates in the next year are unavailable.
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              <Users className="mr-1 inline h-3.5 w-3.5" /> Guests
            </label>
            <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
              <span className="text-sm font-semibold">{guests}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGuests(Math.max(1, guests - 1))}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setGuests(Math.min(20, guests + 1))}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="mt-2 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
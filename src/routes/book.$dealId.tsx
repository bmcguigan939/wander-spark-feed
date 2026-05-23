import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { MobileShell } from "@/components/layout/BottomNav";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { getDeal } from "@/lib/deals.functions";
import { createBookingCheckout } from "@/lib/booking.functions";
import { getBlockedDates } from "@/lib/calendar.functions";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Loader2, Minus, Plus } from "lucide-react";

export const Route = createFileRoute("/book/$dealId")({
  head: () => ({ meta: [{ title: "Book — Travidz" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    v: typeof s.v === "string" ? s.v : undefined,
  }),
  component: BookPage,
});

function BookPage() {
  const { dealId } = Route.useParams();
  const { v: referrerVideoId } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const fetchDeal = useServerFn(getDeal);
  const checkoutFn = useServerFn(createBookingCheckout);
  const fetchBlocked = useServerFn(getBlockedDates);

  const [guests, setGuests] = useState(1);
  const [travelDate, setTravelDate] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { redirect: `/book/${dealId}` } as any });
    }
  }, [loading, user, navigate, dealId]);

  const { data, isLoading } = useQuery({
    queryKey: ["deal", dealId],
    queryFn: () => fetchDeal({ data: { id: dealId } }),
  });
  const deal = (data?.deal as any) ?? null;

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

  async function startCheckout() {
    setErr(null);
    setOpening(true);
    try {
      const res = await checkoutFn({
        data: {
          dealId,
          guests,
          travelDate: travelDate || undefined,
          returnUrl: `${window.location.origin}/book/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
          referrerVideoId,
        },
      });
      setClientSecret(res.clientSecret);
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
      <div className="px-4 pt-4">
        <Link
          to="/deals/$id"
          params={{ id: dealId }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to deal
        </Link>

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

        {deal && !clientSecret && (
          <div className="mt-4 space-y-5">
            <div className="rounded-2xl border border-border bg-card/40 p-4">
              {deal.image_url && (
                <img
                  src={deal.image_url}
                  alt={deal.title}
                  className="aspect-video w-full rounded-xl object-cover"
                />
              )}
              <h1 className="mt-3 text-lg font-semibold">{deal.title}</h1>
              <p className="text-xs text-muted-foreground">
                {[deal.city, deal.country].filter(Boolean).join(", ") || "Anywhere"}
              </p>
            </div>

            {!deal.bookable && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
                This deal isn't bookable through Travidz.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium">Guests</label>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-8 text-center text-base font-semibold">{guests}</span>
                <button
                  type="button"
                  onClick={() => setGuests((g) => Math.min(20, g + 1))}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium" htmlFor="travelDate">
                Travel date (optional)
              </label>
              <input
                id="travelDate"
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              {dateBlocked && (
                <p className="mt-1.5 text-xs text-destructive">
                  This date is already booked — please pick another.
                </p>
              )}
              {blockedSet.size > 0 && !dateBlocked && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {blockedSet.size} dates in the next 12 months are unavailable.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card/40 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {fmt(deal.price_cents ?? 0)} × {guests}
                </span>
                <span className="font-semibold">{fmt(total)}</span>
              </div>
              {deal.cancellation_policy_code && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Cancellation policy: {deal.cancellation_policy_code.replaceAll("_", " ")}
                </p>
              )}
            </div>

            {err && <p className="text-sm text-destructive">{err}</p>}

            <button
              onClick={startCheckout}
              disabled={opening || !deal.bookable || !deal.price_cents || dateBlocked}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60"
            >
              {opening && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue to payment · {fmt(total)}
            </button>
          </div>
        )}

        {clientSecret && (
          <div id="checkout" className="mt-4">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
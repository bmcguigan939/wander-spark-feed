import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, TrendingDown, Equal, Loader2 } from "lucide-react";
import { scanDealPriceMatch } from "@/lib/price-match.scan.functions";

function formatMoney(cents: number, currency = "GBP") {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

/**
 * Automatic Booking.com-style price-match badge. On mount, asks the
 * server to scan major OTAs (Booking, Expedia, Agoda, GetYourGuide,
 * Viator) for the same deal. Result is cached 6h per (deal, dates,
 * guests) so this is cheap on repeat views.
 *
 * UI states:
 *   • Loading → subtle "Checking other sites…"
 *   • Travidz cheaper → green "Best price on Travidz"
 *   • Same price → blue "Price matched with N sites"
 *   • Travidz more expensive → amber "We'll match {network} at checkout"
 *   • No data → render nothing (don't lie)
 */
export function PriceMatchBadge({
  dealId,
  checkIn,
  checkOut,
  guests,
}: {
  dealId: string;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
}) {
  const scan = useServerFn(scanDealPriceMatch);
  const { data, isLoading } = useQuery({
    queryKey: ["price-match", dealId, checkIn ?? null, checkOut ?? null, guests ?? null],
    queryFn: () =>
      scan({
        data: {
          dealId,
          check_in: checkIn ?? null,
          check_out: checkOut ?? null,
          guests: guests ?? null,
        },
      }),
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card/40 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking Booking.com, Expedia, Agoda…
      </div>
    );
  }
  if (!data || !data.scanned) return null;

  const direct = data.direct_price_cents;
  const competitor = data.cheapest_competitor_cents;
  const count = data.scanned_urls.length;

  if (!competitor || !direct) return null;

  const tone =
    direct < competitor
      ? "cheaper"
      : direct === competitor
        ? "match"
        : "higher";

  if (tone === "cheaper") {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
        <TrendingDown className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-semibold">Best price on Travidz</div>
          <div className="text-emerald-200/80">
            {formatMoney(competitor - direct, data.currency)} cheaper than {data.cheapest_competitor_network}
            {count > 1 ? ` and ${count - 1} other site${count - 1 === 1 ? "" : "s"}` : ""}.
          </div>
        </div>
      </div>
    );
  }

  if (tone === "match") {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-semibold">Price matched</div>
          <div className="text-sky-200/80">
            Same price as {data.cheapest_competitor_network}
            {count > 1 ? ` +${count - 1} other site${count - 1 === 1 ? "" : "s"}` : ""}.
          </div>
        </div>
      </div>
    );
  }

  // higher
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
      <Equal className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-semibold">We'll match {data.cheapest_competitor_network}</div>
        <div className="text-amber-200/80">
          They're showing {formatMoney(competitor, data.currency)} — we'll honour the lower price at checkout.
        </div>
      </div>
    </div>
  );
}
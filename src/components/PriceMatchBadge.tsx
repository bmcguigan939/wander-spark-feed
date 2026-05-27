import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, TrendingDown, Equal, Loader2, Tag } from "lucide-react";
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
  roomId,
}: {
  dealId: string;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
  roomId?: string | null;
}) {
  const scan = useServerFn(scanDealPriceMatch);
  const { data, isLoading } = useQuery({
    queryKey: ["price-match", dealId, roomId ?? null, checkIn ?? null, checkOut ?? null, guests ?? null],
    queryFn: () =>
      scan({
        data: {
          dealId,
          room_id: roomId ?? null,
          check_in: checkIn ?? null,
          check_out: checkOut ?? null,
          guests: guests ?? null,
        },
      }),
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    // We don't know pricing_model until the scan returns, so use neutral copy.
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card/40 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking third-party resellers…
      </div>
    );
  }
  if (!data || !data.scanned) return null;

  const direct = data.direct_price_cents;
  const competitor = data.cheapest_competitor_cents;
  const count = data.scanned_urls.length;

  if (!competitor || !direct) return null;

  const isOperator = (data as any).pricing_model === "operator_markup";
  const confidence = (data as any).match_confidence as
    | "high"
    | "medium"
    | "low"
    | null
    | undefined;

  const tone =
    direct < competitor
      ? "cheaper"
      : direct === competitor
        ? "match"
        : "higher";

  if (tone === "cheaper") {
    if (isOperator) {
      return (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <TrendingDown className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Cheaper than other resellers</div>
            <div className="text-emerald-200/80">
              {formatMoney(competitor - direct, data.currency)} less than {data.cheapest_competitor_network}
              {count > 1 ? ` and ${count - 1} other reseller${count - 1 === 1 ? "" : "s"}` : ""}.
            </div>
            <div className="mt-1 text-[10px] leading-snug text-emerald-200/60">
              Compared against major third-party resale platforms. The operator may sell
              direct on their own website. Travidz adds an 11% booking fee on top of the
              operator's price for secure checkout, support and creator rewards.
            </div>
          </div>
        </div>
      );
    }
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
    if (isOperator) {
      return (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Matches other resellers</div>
            <div className="text-sky-200/80">
              Same price as {data.cheapest_competitor_network}
              {count > 1 ? ` +${count - 1} other reseller${count - 1 === 1 ? "" : "s"}` : ""}.
            </div>
            <div className="mt-1 text-[10px] leading-snug text-sky-200/60">
              Compared against third-party resale platforms. The operator may sell direct.
              Travidz adds an 11% booking fee on top of the operator's price.
            </div>
          </div>
        </div>
      );
    }
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

  // higher — for operator deals, never offer to "match", since the operator may
  // sell direct on their own site at any price.
  if (isOperator) return null;
  // Only auto-issue MATCH codes on high-confidence (pinned URL + room-name match).
  // For medium/low we show a soft signal without a redeemable code — businesses
  // shouldn't get refunds against a guess.
  if (confidence !== "high") {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
        <Equal className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-semibold">We think it's cheaper on {data.cheapest_competitor_network}</div>
          <div className="text-amber-200/70">
            They're showing {formatMoney(competitor, data.currency)}.{" "}
            <a
              href={data.cheapest_competitor_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Check the listing
            </a>
            . We're still verifying it's the same room/ticket.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
      <Equal className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-semibold">We'll match {data.cheapest_competitor_network}</div>
        <div className="text-amber-200/80">
          They're showing {formatMoney(competitor, data.currency)} — we'll honour the lower price at checkout.
        </div>
        {data.match_code && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2 py-1 font-mono text-[11px] font-semibold text-amber-100">
            <Tag className="h-3 w-3" /> {data.match_code}
          </div>
        )}
      </div>
    </div>
  );
}
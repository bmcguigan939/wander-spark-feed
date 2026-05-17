import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMatchCode } from "@/lib/price-match.functions";
import { MobileShell } from "@/components/layout/BottomNav";
import { BadgePercent, ExternalLink, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/book/match/$code")({
  head: () => ({ meta: [{ title: "Your price-match code — Travidz" }] }),
  component: MatchPage,
});

function formatPrice(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function MatchPage() {
  const { code } = Route.useParams();
  const fetchCode = useServerFn(getMatchCode);
  const { data, isLoading } = useQuery({
    queryKey: ["match-code", code],
    queryFn: () => fetchCode({ data: { code } }),
  });

  if (isLoading) {
    return (
      <MobileShell>
        <div className="p-6 text-sm text-muted-foreground">Loading your match code…</div>
      </MobileShell>
    );
  }

  if (!data?.code) {
    return (
      <MobileShell>
        <div className="p-6 space-y-3">
          <h1 className="text-xl font-semibold">Code not found</h1>
          <p className="text-sm text-muted-foreground">
            This match code is invalid or has expired.
          </p>
          <Link to="/" className="text-sm font-semibold underline">Back to home</Link>
        </div>
      </MobileShell>
    );
  }

  const row = data.code;
  const link = data.link;
  const expires = new Date(row.expires_at);
  const expired = expires.getTime() < Date.now();
  const bookUrl = link?.url
    ? `${link.url}${link.url.includes("?") ? "&" : "?"}travidz_match=${encodeURIComponent(row.code)}`
    : null;

  return (
    <MobileShell>
      <div className="p-4 space-y-4">
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <BadgePercent className="h-5 w-5" />
            <span className="font-semibold">Best Price Guarantee</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Your match code</h1>
          <div className="rounded-xl bg-muted px-4 py-3 font-mono text-lg tracking-wider text-center">
            {row.code}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {expired
              ? "Expired"
              : `Valid until ${expires.toLocaleString()}`}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Matched from</span>
            <span className="font-medium capitalize">{row.competitor_network}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Their price</span>
            <span>{formatPrice(row.original_price_cents, row.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Your price today</span>
            <span className="font-bold text-primary">
              {formatPrice(row.matched_price_cents, row.currency)}
            </span>
          </div>
          <a
            href={row.competitor_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline pt-2"
          >
            See the competitor listing <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {bookUrl && !expired && (
          <a href={bookUrl} target="_blank" rel="noopener noreferrer">
            <Button className="w-full" size="lg">
              Book direct with match code
            </Button>
          </a>
        )}

        <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground flex gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Travidz checked supported booking sites at the moment you tapped book. The business
            has authorised us to match the cheapest publicly available price. Present this code
            at checkout if requested.
          </p>
        </div>
      </div>
    </MobileShell>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { ArrowLeft, Calculator, Crown, Lock, Sparkles } from "lucide-react";
import { COMMISSION } from "@/lib/commission";

export const Route = createFileRoute("/creator/calculator")({
  head: () => ({
    meta: [
      { title: "Creator earnings calculator — Travidz" },
      {
        name: "description",
        content:
          "See how much you earn per booking on Travidz across the tapered tiers and the Power Creator lock.",
      },
    ],
  }),
  component: CreatorCalculatorPage,
});

const TIERS = [
  { id: "founding", label: "Founding Creator", desc: "First 500 creators — locked at 50% for life.", pct: 50, icon: Crown },
  { id: "power", label: "Power Creator", desc: "Lifetime lock when you cross £25k rolling-12mo bookings.", pct: 50, icon: Lock },
  { id: "new", label: "New (months 0–6)", desc: "Welcome rate while you ramp up.", pct: 50, icon: Sparkles },
  { id: "maturing", label: "Maturing (months 7–18)", desc: "Standard share once you've established.", pct: 40, icon: Sparkles },
  { id: "mature", label: "Mature (19+ months)", desc: "Long-tenured creators on the standard ladder.", pct: 30, icon: Sparkles },
] as const;

function fmt(cents: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(cents / 100);
}

function CreatorCalculatorPage() {
  const [bookingValue, setBookingValue] = useState(500); // £
  const [bookingsPerMonth, setBookingsPerMonth] = useState(20);
  const orderCents = Math.round(bookingValue * 100);
  const totalCommission = Math.round(orderCents * (COMMISSION.totalPct / 100));

  return (
    <MobileShell>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/85 px-5 py-4 backdrop-blur-xl">
        <Link to="/creator/earnings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Calculator className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Earnings calculator</h1>
      </header>

      <div className="space-y-6 px-5 pb-10 pt-5">
        <section className="rounded-2xl border border-border bg-card/40 p-4 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Average booking value
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range" min={50} max={3000} step={10}
                value={bookingValue}
                onChange={(e) => setBookingValue(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-20 text-right font-bold tabular-nums">£{bookingValue}</span>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Confirmed bookings / month
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range" min={1} max={200} step={1}
                value={bookingsPerMonth}
                onChange={(e) => setBookingsPerMonth(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-20 text-right font-bold tabular-nums">{bookingsPerMonth}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Businesses always pay a flat <strong>8% commission</strong> on each booking
            ({fmt(totalCommission)} on a {fmt(orderCents)} booking). Your share depends on your tier.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your take-home by tier
          </h2>
          {TIERS.map((t) => {
            const perBooking = Math.round(totalCommission * (t.pct / 100));
            const monthly = perBooking * bookingsPerMonth;
            const yearly = monthly * 12;
            const Icon = t.icon;
            const highlight = t.id === "founding" || t.id === "power";
            return (
              <div
                key={t.id}
                className={`rounded-2xl border p-4 ${highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card/40"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`flex items-center gap-1.5 text-sm font-bold ${highlight ? "text-primary" : ""}`}>
                      <Icon className="h-4 w-4" />
                      {t.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                  <div className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
                    {t.pct}%
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Per booking" value={fmt(perBooking)} />
                  <Stat label="Per month" value={fmt(monthly)} />
                  <Stat label="Per year" value={fmt(yearly)} accent={highlight} />
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-border bg-card/40 p-4 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">How tiers work.</strong> Everyone starts at 50% for the first
            6 months. From month 7 the standard ladder tapers to 40%, then 30% from month 19. You can lock
            50% forever by either being one of the first 500 creators or by crossing £25,000 in confirmed
            bookings over any rolling 12-month window.
          </p>
        </section>
      </div>
    </MobileShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-2 ${accent ? "border-primary/40 bg-primary/10" : "border-border bg-background/40"}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-bold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

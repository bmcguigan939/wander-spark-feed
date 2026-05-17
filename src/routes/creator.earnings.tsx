import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth";
import { getCreatorEarningsSummary, getCreatorEarningsByDeal } from "@/lib/earnings.functions";
import { listCreatorPayouts } from "@/lib/payouts.functions";
import { PayoutDetailsForm } from "@/components/creator/PayoutDetailsForm";
import { Wallet, ArrowLeft, TrendingUp, Banknote } from "lucide-react";

export const Route = createFileRoute("/creator/earnings")({
  head: () => ({ meta: [{ title: "Earnings — Travidz" }, { name: "robots", content: "noindex" }] }),
  component: EarningsPage,
});

function money(cents: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format((cents ?? 0) / 100);
}

function EarningsPage() {
  const { user, loading, isCreator } = useAuth();
  const navigate = useNavigate();
  const summaryFn = useServerFn(getCreatorEarningsSummary);
  const byDealFn = useServerFn(getCreatorEarningsByDeal);
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    else if (!loading && user && !isCreator) navigate({ to: "/profile" });
  }, [loading, user, isCreator, navigate]);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["earnings-summary", user?.id ?? null],
    queryFn: () => summaryFn({ data: undefined as any }),
    enabled: !!user && isCreator,
  });

  const { data: byDeal } = useQuery({
    queryKey: ["earnings-by-deal", user?.id ?? null, selectedMonth ?? "all"],
    queryFn: () => byDealFn({ data: { month: selectedMonth } }),
    enabled: !!user && isCreator,
  });

  const payoutsFn = useServerFn(listCreatorPayouts);
  const { data: payouts } = useQuery({
    queryKey: ["creator-payouts", user?.id ?? null],
    queryFn: () => payoutsFn(),
    enabled: !!user && isCreator,
  });

  const months = summary?.months ?? [];
  const last6 = months.slice(0, 6).slice().reverse();
  const maxCommission = Math.max(1, ...last6.map((m) => Number(m.commission_cents_total ?? 0)));

  return (
    <MobileShell>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/85 px-5 py-4 backdrop-blur-xl">
        <Link to="/creator/analytics" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Wallet className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Earnings</h1>
      </header>

      <div className="space-y-6 px-5 pb-10 pt-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <Kpi label="Lifetime commission" value={isLoading ? "—" : money(summary?.totals.lifetime_commission_cents ?? 0)} accent />
          <Kpi label="Payable now" value={isLoading ? "—" : money(summary?.totals.payable_cents ?? 0)} />
          <Kpi label="Pending clearance" value={isLoading ? "—" : money(summary?.totals.pending_cents ?? 0)} />
          <Kpi label="This month" value={isLoading ? "—" : money(summary?.totals.this_month_commission_cents ?? 0)} />
        </div>

        {/* Payout history */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payouts</h2>
          </div>
          {(payouts?.runs?.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
              No payouts yet. We bundle confirmed bookings into weekly runs once you cross the £20 minimum.
            </div>
          ) : (
            <ul className="space-y-2">
              {(payouts!.runs as any[]).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {r.period_start} → {r.period_end}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.redemption_count} booking{r.redemption_count === 1 ? "" : "s"} ·{" "}
                      <span className={
                        r.status === "paid" ? "text-emerald-600"
                        : r.status === "void" ? "line-through"
                        : "text-amber-600"
                      }>
                        {r.status}
                      </span>
                      {r.paid_at && <> · paid {new Date(r.paid_at).toLocaleDateString()}</>}
                      {r.external_reference && <> · ref {r.external_reference}</>}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-primary">{money(r.total_cents, r.currency)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Bank details */}
        <section>
          <PayoutDetailsForm />
        </section>

        {/* Monthly chart */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Last 6 months</h2>
          </div>
          {last6.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
              No confirmed bookings yet. Earnings appear here once a business confirms a redemption.
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card/40 p-4">
              <div className="flex h-40 items-end gap-2">
                {last6.map((m) => {
                  const cents = Number(m.commission_cents_total ?? 0);
                  const h = Math.max(4, Math.round((cents / maxCommission) * 140));
                  const key = String(m.month).slice(0, 10);
                  const active = selectedMonth === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedMonth(active ? undefined : key)}
                      className="group flex flex-1 flex-col items-center gap-1"
                      title={money(cents)}
                    >
                      <span className={`w-full rounded-md ${active ? "bg-primary" : "bg-primary/40 group-hover:bg-primary/70"}`} style={{ height: `${h}px` }} />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(m.month as string).toLocaleDateString(undefined, { month: "short" })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Per-deal table */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {selectedMonth ? `Deals — ${new Date(selectedMonth).toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : "All confirmed bookings by deal"}
          </h2>
          {(byDeal?.deals.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
              No confirmed bookings in this period.
            </div>
          ) : (
            <ul className="space-y-2">
              {byDeal!.deals.map((d) => (
                <li key={d.deal_id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  {d.image_url ? (
                    <img src={d.image_url} alt="" className="h-12 w-12 flex-shrink-0 rounded-md object-cover" />
                  ) : (
                    <div className="h-12 w-12 flex-shrink-0 rounded-md bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{d.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.redemption_count} booking{d.redemption_count === 1 ? "" : "s"} · {money(d.gross_cents)} gross
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{money(d.commission_cents)}</p>
                    <p className="text-[10px] text-muted-foreground">commission</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </MobileShell>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card/40"} p-4`}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
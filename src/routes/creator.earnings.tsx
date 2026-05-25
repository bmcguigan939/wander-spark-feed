import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth";
import { getCreatorEarningsSummary, getCreatorEarningsByDeal } from "@/lib/earnings.functions";
import { listCreatorPayouts } from "@/lib/payouts.functions";
import { PayoutDetailsForm } from "@/components/creator/PayoutDetailsForm";
import { Wallet, ArrowLeft, TrendingUp, Banknote, Crown, Sparkles, Lock } from "lucide-react";
import { getMyCreatorTier } from "@/lib/creator-tier.functions";

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

  const tierFn = useServerFn(getMyCreatorTier);
  const { data: tier } = useQuery({
    queryKey: ["creator-tier", user?.id ?? null],
    queryFn: () => tierFn(),
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
        {/* Tier card */}
        {tier && <TierCard tier={tier} />}

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
              No payouts yet. Payouts run at the end of each month — confirmed bookings of £20 or more are bundled and paid out on the 1st of the following month.
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

function TierCard({ tier }: { tier: Awaited<ReturnType<typeof getMyCreatorTier>> }) {
  const Icon = tier.tier === "founding" ? Crown : tier.tier === "power" ? Lock : Sparkles;
  const showProgress = tier.tier !== "founding" && tier.tier !== "power";
  const pct = Math.min(100, Math.round((tier.rolling12moGbvCents / tier.powerThresholdCents) * 100));
  const videoBarMet = tier.videosLast30d >= tier.videosRequiredPer30d;
  const gbvBarMet = tier.rolling12moGbvCents >= tier.powerThresholdCents;
  const onGrace = tier.tier === "power" && (!videoBarMet || !gbvBarMet);
  const gbpFmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary">
            <Icon className="h-3.5 w-3.5" /> Your tier
          </p>
          <p className="mt-1 text-lg font-bold">
            {tier.tierLabel}
            {tier.isFounding && tier.foundingNumber ? ` #${tier.foundingNumber}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            You keep <span className="font-semibold text-foreground">{tier.creatorPct}%</span> of the net commission pool (11% gross − Stripe fees) on every booking.
            {tier.tier === "founding" && tier.foundingLockEndsAt
              ? ` Founding rate locked until ${new Date(tier.foundingLockEndsAt).toLocaleDateString()}.`
              : ""}
            {tier.tier === "power" ? " Locked while you stay active." : ""}
          </p>
        </div>
        <div className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
          {tier.creatorPct}/{tier.platformPct}
        </div>
      </div>

      {/* Power Tier activity status — visible to power creators OR anyone with progress toward unlock */}
      {(tier.tier === "power" || tier.tier === "founding") && (
        <div className="mt-3 rounded-xl border border-border bg-background/40 p-3 text-xs">
          <p className="mb-2 font-semibold text-foreground">
            {tier.tier === "power" ? "Keep Power Creator: stay above both bars" : "Power Creator rules (kick in after founding lock)"}
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Videos in last 30 days</span>
              <span className={videoBarMet ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                {tier.videosLast30d} / {tier.videosRequiredPer30d}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rolling 12-mo bookings</span>
              <span className={gbvBarMet ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                {gbpFmt.format(tier.rolling12moGbvCents / 100)} / {gbpFmt.format(tier.powerThresholdCents / 100)}
              </span>
            </div>
          </div>
          {onGrace && tier.gracePeriodEndsAt && (
            <p className="mt-2 text-[11px] font-semibold text-amber-600">
              Below the bar — Power Tier reverts on{" "}
              {new Date(tier.gracePeriodEndsAt).toLocaleDateString()} ({Math.max(0, Math.ceil((new Date(tier.gracePeriodEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days grace remaining).
            </p>
          )}
        </div>
      )}

      {showProgress && (
        <div className="mt-3">
          <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
            <span>Rolling 12-mo GBV: {gbpFmt.format(tier.rolling12moGbvCents / 100)}</span>
            <span>£{Math.round(tier.powerThresholdCents / 100).toLocaleString()} to lock 50% forever</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Power Creator also requires ≥ {tier.videosRequiredPer30d} published video every 30 days
            (you have <span className="font-semibold text-foreground">{tier.videosLast30d}</span> in the last 30).
          </p>
          {tier.centsToPowerTier > 0 && tier.centsToPowerTier < 500000 && (
            <p className="mt-2 text-xs font-semibold text-primary">
              Only {gbpFmt.format(tier.centsToPowerTier / 100)} more in bookings to unlock Power Creator.
            </p>
          )}
        </div>
      )}
      <Link to="/creator/calculator" className="mt-3 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline">
        Open earnings calculator →
      </Link>
    </div>
  );
}
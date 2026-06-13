import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { listMyDeals, getDealStats } from "@/lib/deals.functions";
import { useAuth } from "@/lib/auth";
import { Plus, Briefcase, Eye, Pencil, TrendingUp, TrendingDown, Users, Calculator, BadgeCheck, ShieldCheck, MessageSquare, Zap, Hotel, Mountain } from "lucide-react";
import { Sparkline } from "@/components/business/Sparkline";
import { OnboardingChecklist } from "@/components/business/OnboardingChecklist";
import { BusinessLocationPrompt } from "@/components/business/BusinessLocationPrompt";
import { PayoutMethodCard } from "@/components/business/PayoutMethodCard";
import { useAccountKind } from "@/lib/useAccountKind";
import { getMySetupState } from "@/lib/business-setup.functions";
import { Rocket } from "lucide-react";

export const Route = createFileRoute("/business/")({
  head: () => ({ meta: [{ title: "Business Portal — Travidz" }] }),
  component: BusinessDashboard,
});

function BusinessDashboard() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const fetchDeals = useServerFn(listMyDeals);
  const fetchStats = useServerFn(getDealStats);
  const fetchSetup = useServerFn(getMySetupState);
  const accountKind = useAccountKind();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-deals"],
    queryFn: () => fetchDeals(),
    enabled: !!user && isBusiness,
  });
  const deals = data?.deals ?? [];

  const { data: setupState } = useQuery({
    queryKey: ["business-setup-state"],
    queryFn: () => fetchSetup(),
    enabled: !!user && isBusiness,
  });
  const setupStep = (setupState?.profile as any)?.setup_step_completed ?? 0;
  const setupDone = !!(setupState?.profile as any)?.setup_completed_at;
  const showSetupCta = !setupDone;

  const statsQueries = useQueries({
    queries: deals.map((d: any) => ({
      queryKey: ["deal-stats", d.id, "7d"],
      queryFn: () => fetchStats({ data: { dealId: d.id, range: "7d" as const } }),
      enabled: !!user && isBusiness,
      staleTime: 60_000,
    })),
  });

  if (!user || !isBusiness) return null;

  return (
    <MobileShell>
      <div className="px-4 pt-6">
        {user && <BusinessLocationPrompt userId={user.id} />}
        {showSetupCta && (() => {
          const kind = (setupState?.profile as any)?.setup_business_type as
            | "stay"
            | "activity"
            | null
            | undefined;
          if (!kind) {
            return (
              <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                  <Rocket className="h-4 w-4" />
                  Set up your listing
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Pick the path that matches your business — the rest of setup is tailored to it.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/business/setup"
                    className="flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-3 text-left hover:border-primary"
                  >
                    <Hotel className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold">I offer stays</span>
                    <span className="text-[11px] text-muted-foreground">
                      Hotels, apartments, villas, B&amp;Bs
                    </span>
                  </Link>
                  <Link
                    to="/business/setup"
                    className="flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-3 text-left hover:border-primary"
                  >
                    <Mountain className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold">I run activities</span>
                    <span className="text-[11px] text-muted-foreground">
                      Tours, classes, experiences, rentals
                    </span>
                  </Link>
                </div>
              </div>
            );
          }
          const totalSteps = kind === "activity" ? 11 : 16;
          const label =
            kind === "activity" ? "Resume activity setup" : "Resume stay setup";
          const sub = `Step ${Math.min(setupStep + 1, totalSteps)} / ${totalSteps}`;
          return (
            <div className="mb-4 flex flex-col gap-1 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <Link
                  to="/business/setup"
                  className="flex items-center gap-2 font-semibold text-primary"
                >
                  <Rocket className="h-4 w-4" />
                  {label}
                </Link>
                <span className="text-xs font-medium text-primary">{sub}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Path: {kind === "activity" ? "Activities" : "Stays"}
                </span>
                <Link
                  to="/business/setup"
                  search={{ changePath: true }}
                  className="underline hover:text-foreground"
                >
                  Change path
                </Link>
              </div>
            </div>
          );
        })()}
        <OnboardingChecklist />
        <div className="mb-4">
          <PayoutMethodCard />
        </div>
        {/* Property photos moved to /business/photos */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">My Deals</h1>
          </div>
          <Link
            to="/business/deals/new"
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </Link>
        </div>
        <Link
          to="/business/applications"
          className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card/40 px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Creator applications
          </span>
          <span className="text-xs text-muted-foreground">View</span>
        </Link>
        <Link
          to="/business/collabs"
          className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card/40 px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Collab defaults & auto-accept
          </span>
          <span className="text-xs text-muted-foreground">Setup</span>
        </Link>
        <Link
          to="/business/threads"
          className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card/40 px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Creator messages
          </span>
          <span className="text-xs text-muted-foreground">Open</span>
        </Link>
        <Link
          to="/business/redemptions"
          className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card/40 px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-primary" /> Booking confirmations
          </span>
          <span className="text-xs text-muted-foreground">Manage</span>
        </Link>
        <Link
          to="/business/calculator"
          className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card/40 px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" /> Deal calculator
          </span>
          <span className="text-xs text-muted-foreground">Open</span>
        </Link>
        <Link
          to="/business/price-audit"
          className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card/40 px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Price-match audit
          </span>
          <span className="text-xs text-muted-foreground">View</span>
        </Link>
        {isLoading && (
          <ul className="space-y-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </ul>
        )}
        {!isLoading && deals.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                {accountKind === "activity"
                  ? "No activities yet"
                  : accountKind === "stay"
                  ? "No stays yet"
                  : "No deals yet"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {accountKind === "activity"
                  ? "Publish your first activity so creators can promote it and travellers can book."
                  : "Publish your first offer so creators can promote it and viewers can book."}
              </p>
            </div>
            <Link
              to="/business/deals/new"
              className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />{" "}
              {accountKind === "activity" ? "Create an activity" : "Create a deal"}
            </Link>
          </div>
        )}
        <ul className="space-y-3">
          {deals.map((d: any, i: number) => {
            const s = statsQueries[i]?.data as
              | { totals: { clicks: number; prevClicks: number }; daily: { day: string; clicks: number }[] }
              | undefined;
            const clicks7d = s?.totals.clicks ?? 0;
            const prev = s?.totals.prevClicks ?? 0;
            const delta = clicks7d - prev;
            const series = s?.daily.map((x) => x.clicks) ?? [];
            return (
            <li
              key={d.id}
              className="overflow-hidden rounded-2xl border border-border bg-card p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link to="/business/deals/$id" params={{ id: d.id }}>
                    <h2 className="line-clamp-2 text-sm font-semibold hover:text-primary">{d.title}</h2>
                  </Link>
                   <p className="mt-0.5 text-xs text-muted-foreground">
                     {[d.city, d.country].filter(Boolean).join(", ") || d.destination || "Anywhere"}
                   </p>
                   <p className="mt-0.5 text-[11px] text-muted-foreground">
                     Tap <span className="font-medium text-foreground">Edit</span> to update price, photo or description.
                   </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {d.click_count} clicks</span>
                    <span className={d.is_active ? "text-emerald-500" : "text-muted-foreground"}>
                      {d.is_active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="text-primary">
                      <Sparkline values={series.length ? series : [0]} />
                    </div>
                    <div className="text-xs">
                      <div className="font-semibold">{clicks7d} <span className="text-muted-foreground font-normal">/ 7d</span></div>
                      {prev > 0 || clicks7d > 0 ? (
                        <div className={`inline-flex items-center gap-0.5 ${delta >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                          {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {delta >= 0 ? "+" : ""}{delta}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                 <Link
                   to="/business/deals/$id/edit"
                   params={{ id: d.id }}
                   className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft"
                 >
                   <Pencil className="h-3.5 w-3.5" /> Edit
                 </Link>
              </div>
            </li>
            );
          })}
        </ul>
      </div>
    </MobileShell>
  );
}
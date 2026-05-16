import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { getDealStats } from "@/lib/deals.functions";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Pencil, MapPin, Eye, Users, MousePointerClick, Percent } from "lucide-react";

export const Route = createFileRoute("/business/deals/$id/")({
  head: () => ({ meta: [{ title: "Deal analytics — Travidz" }] }),
  component: DealAnalyticsPage,
});

function DealAnalyticsPage() {
  const { id } = Route.useParams();
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const fetchStats = useServerFn(getDealStats);
  const [range, setRange] = useState<"7d" | "30d">("7d");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["deal-stats", id, range],
    queryFn: () => fetchStats({ data: { dealId: id, range } }),
    enabled: !!user && isBusiness,
    retry: false,
  });

  if (!user || !isBusiness) return null;

  const deal = data?.deal as any;
  const totals = data?.totals;
  const daily = data?.daily ?? [];
  const topVideos = data?.topVideos ?? [];
  const max = Math.max(1, ...daily.map((d) => d.clicks));
  const delta = (totals?.clicks ?? 0) - (totals?.prevClicks ?? 0);
  const impressions = totals?.impressions ?? 0;
  const ctr = totals?.ctr ?? 0;

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-8">
        <div className="flex items-center justify-between">
          <Link to="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          {deal && (
            <Link
              to="/business/deals/$id/edit"
              params={{ id }}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs"
            >
              <Pencil className="h-3 w-3" /> Edit
            </Link>
          )}
        </div>

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

        {deal && (
          <>
            <h1 className="mt-3 text-xl font-semibold">{deal.title}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>
                {[deal.city, deal.country].filter(Boolean).join(", ") || deal.destination || "Anywhere"}
              </span>
              <span className={deal.is_active ? "text-emerald-500" : ""}>
                · {deal.is_active ? "Active" : "Paused"}
              </span>
            </div>

            <div className="mt-4 inline-flex rounded-full border border-border p-0.5 text-xs">
              {(["7d", "30d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-full px-3 py-1 ${
                    range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {r === "7d" ? "Last 7 days" : "Last 30 days"}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat icon={Eye} label="Impressions" value={impressions} />
              <Stat icon={MousePointerClick} label="Clicks" value={totals?.clicks ?? 0} sub={delta >= 0 ? `+${delta}` : `${delta}`} />
              <Stat icon={Percent} label="CTR" value={Math.round(ctr * 1000) / 10} suffix="%" />
              <Stat icon={Users} label="Unique clickers" value={totals?.uniqueUsers ?? 0} />
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Funnel
              </h3>
              <FunnelBar label="Impressions" value={impressions} max={Math.max(impressions, 1)} tone="bg-primary/30" />
              <FunnelBar label="Clicks" value={totals?.clicks ?? 0} max={Math.max(impressions, 1)} tone="bg-primary" />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {impressions === 0 ? "Waiting for the first viewer to see this deal on a creator's video." : `${Math.round(ctr * 1000) / 10}% of viewers tapped through.`}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Clicks per day
              </h3>
              {daily.length > 0 ? (
                <div className="flex items-end gap-1" style={{ height: 120 }}>
                  {daily.map((d) => (
                    <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-primary/80"
                        style={{ height: `${(d.clicks / max) * 100}%`, minHeight: d.clicks > 0 ? 2 : 0 }}
                        title={`${d.day}: ${d.clicks}`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No clicks yet.</p>
              )}
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>{daily[0]?.day.slice(5)}</span>
                <span>{daily[daily.length - 1]?.day.slice(5)}</span>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Top referring videos
              </h3>
              {topVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No video-attributed clicks yet. When viewers tap the deal pill on a creator's video, it'll show here.
                </p>
              ) : (
                <ul className="space-y-2">
                  {topVideos.map((v) => (
                    <li
                      key={v.videoId}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-2"
                    >
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        {v.thumbnail_url && (
                          <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-sm font-medium">{v.title}</div>
                        {v.creator_username && (
                          <Link
                            to="/u/$username"
                            params={{ username: v.creator_username }}
                            className="text-xs text-muted-foreground hover:text-primary"
                          >
                            @{v.creator_username}
                          </Link>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold tabular-nums">{v.clicks} / {v.impressions}</div>
                        <div className="text-[10px] text-muted-foreground">clicks · imps</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </MobileShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  suffix,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  sub?: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}{suffix ?? ""}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function FunnelBar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  const pct = Math.max(2, Math.round((value / max) * 100));
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value.toLocaleString()}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
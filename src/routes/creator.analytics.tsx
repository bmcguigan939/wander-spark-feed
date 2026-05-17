import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth";
import { getCreatorAnalytics } from "@/lib/analytics.functions";
import { getCreatorRedemptionStats } from "@/lib/redemptions.functions";
import { BarChart3, Eye, Heart, Bookmark, MessageCircle, Users, Clock, Video, MousePointerClick, BadgeCheck, Wallet } from "lucide-react";

export const Route = createFileRoute("/creator/analytics")({
  head: () => ({ meta: [{ title: "Creator analytics — Travidz" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { user, loading, isCreator } = useAuth();
  const navigate = useNavigate();
  const fn = useServerFn(getCreatorAnalytics);
  const redFn = useServerFn(getCreatorRedemptionStats);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    else if (!loading && user && !isCreator) navigate({ to: "/profile" });
  }, [loading, user, isCreator, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["creator-analytics", user?.id ?? null],
    queryFn: () => fn({ data: undefined as any }),
    enabled: !!user && isCreator,
    refetchInterval: 30_000,
  });

  const { data: red } = useQuery({
    queryKey: ["creator-redemptions", user?.id ?? null],
    queryFn: () => redFn({ data: undefined as any }),
    enabled: !!user && isCreator,
    refetchInterval: 60_000,
  });

  return (
    <MobileShell>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/85 px-5 py-4 backdrop-blur-xl">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Creator analytics</h1>
      </header>
      <div className="space-y-6 px-5 pb-10 pt-5">
        {isLoading || !data ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={Eye} label="Views" value={data.totals.views} />
              <Stat icon={Heart} label="Likes" value={data.totals.likes} />
              <Stat icon={Bookmark} label="Saves" value={data.totals.saves} />
              <Stat icon={MessageCircle} label="Comments" value={data.totals.comments} />
              <Stat icon={Users} label="Followers" value={data.totals.followers} />
              <Stat icon={Clock} label="Watch time" value={`${Math.round(data.totals.watchMs / 60000)}m`} />
            </div>

            <Section title="Deal tracking links">
              <div className="grid grid-cols-2 gap-3">
                <Stat icon={MousePointerClick} label="Total clicks" value={data.totals.dealClicks} />
                <Stat icon={MousePointerClick} label="Last 30 days" value={data.totals.dealClicks30d} />
              </div>
            </Section>

            <Section title="Bookings & commission">
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  icon={BadgeCheck}
                  label="Pending bookings"
                  value={red?.pendingCount ?? 0}
                />
                <Stat
                  icon={BadgeCheck}
                  label="Confirmed bookings"
                  value={red?.confirmedCount ?? 0}
                />
                <Stat
                  icon={Wallet}
                  label="Confirmed commission"
                  value={
                    red
                      ? `${(red.confirmedCommissionCents / 100).toFixed(2)} ${red.currency}`
                      : "—"
                  }
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Commission is recorded for tracking only — payouts will be enabled once banking is set up.
              </p>
            </Section>

            <Section title="Views — last 14 days">
              <DailyBars daily={data.daily} />
            </Section>

            <Section title="Top videos">
              {data.topVideos.length === 0 ? (
                <Empty msg="Upload a video to see stats." />
              ) : (
                <ul className="space-y-2">
                  {data.topVideos.map((v) => (
                    <li key={v.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2">
                      {v.thumbnail_url ? (
                        <img src={v.thumbnail_url} alt="" className="h-14 w-10 flex-shrink-0 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Video className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{v.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {v.view_count} views · {v.like_count} likes · {v.save_count} saves
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Recent followers">
              {data.recentFollowers.length === 0 ? (
                <Empty msg="No new followers yet." />
              ) : (
                <ul className="space-y-2">
                  {data.recentFollowers.map((f) => (
                    <li key={f.id}>
                      <Link to="/u/$username" params={{ username: f.username }} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2">
                        <img
                          src={f.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(f.username)}`}
                          alt=""
                          className="h-9 w-9 rounded-full border border-border object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{f.display_name ?? `@${f.username}`}</p>
                          <p className="text-[11px] text-muted-foreground">@{f.username}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </div>
    </MobileShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 text-center text-xs text-muted-foreground">{msg}</p>;
}

function DailyBars({ daily }: { daily: Array<{ date: string; views: number }> }) {
  const max = Math.max(1, ...daily.map((d) => d.views));
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex h-32 items-end gap-1">
        {daily.map((d) => {
          const h = Math.max(2, Math.round((d.views / max) * 100));
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center justify-end" title={`${d.date}: ${d.views}`}>
              <div className="w-full rounded-t bg-gradient-to-t from-primary/50 to-primary" style={{ height: `${h}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{daily[0]?.date.slice(5)}</span>
        <span>{daily[daily.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}
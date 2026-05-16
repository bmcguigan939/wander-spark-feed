import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell } from "@/components/layout/BottomNav";
import { getDestinationOverview, generateDestinationOverview } from "@/lib/destinations.functions";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Heart, Sparkles, CalendarRange, Tag, MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/destinations/$country/$city")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.city}, ${params.country} — Travidz` },
      { name: "description", content: `Travel videos in ${params.city}, ${params.country}.` },
    ],
  }),
  component: CityPage,
});

function CityPage() {
  const { country, city } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const genFn = useServerFn(generateDestinationOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["destination-overview", country, city],
    queryFn: () => getDestinationOverview({ data: { country, city } }),
  });
  const videos = data?.videos ?? [];
  const deals = data?.deals ?? [];
  const topCreators = data?.topCreators ?? [];
  const summary = data?.summary ?? null;
  const stats = data?.stats ?? { videos: 0, creators: 0, likes: 0 };

  const gen = useMutation({
    mutationFn: () => genFn({ data: { country, city } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["destination-overview", country, city] });
      toast("Overview ready");
    },
    onError: (e: any) => toast(e?.message ?? "Could not generate overview"),
  });

  return (
    <MobileShell>
      <div className="px-4 pt-6 pb-8">
        <Link to="/destinations/$country" params={{ country }} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> {country}
        </Link>

        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-primary/15 via-card to-card p-5 ring-1 ring-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {country}
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{city}</h1>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span><b className="text-foreground">{stats.videos}</b> videos</span>
            <span><b className="text-foreground">{stats.creators}</b> creators</span>
            <span><b className="text-foreground">{stats.likes}</b> likes</span>
          </div>
        </div>

        {/* AI summary */}
        <section className="mt-5 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Overview
            </h2>
            {summary && user && (
              <button onClick={() => gen.mutate()} disabled={gen.isPending} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${gen.isPending ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
          {summary ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">{summary.summary}</p>
              {summary.best_time && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarRange className="h-3.5 w-3.5" /> Best time: <span className="text-foreground">{summary.best_time}</span>
                </div>
              )}
              {Array.isArray(summary.highlights) && summary.highlights.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(summary.highlights as string[]).map((h) => (
                    <span key={h} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">{h}</span>
                  ))}
                </div>
              )}
            </>
          ) : isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
          ) : user ? (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">No overview yet. Generate one with AI.</p>
              <button
                onClick={() => gen.mutate()}
                disabled={gen.isPending}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" /> {gen.isPending ? "Generating…" : "Generate AI overview"}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Sign in to generate an AI overview for this destination.</p>
          )}
        </section>

        {/* Plan a trip CTA */}
        <button
          onClick={() => navigate({ to: "/itineraries/new", search: { destination: `${city}, ${country}` } as any })}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3 text-sm font-semibold text-background"
        >
          <Sparkles className="h-4 w-4" /> Plan a trip to {city}
        </button>

        {/* Top creators */}
        {topCreators.length > 1 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold">Top creators</h2>
            <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {topCreators.map((c) => (
                <li key={c.id} className="shrink-0">
                  <Link to="/u/$username" params={{ username: c.username ?? "" }} className="flex w-20 flex-col items-center gap-1.5">
                    <div className="h-16 w-16 overflow-hidden rounded-full bg-muted ring-2 ring-border">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt={c.display_name ?? c.username ?? ""} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="line-clamp-1 text-center text-[11px] font-medium">{c.display_name ?? c.username}</div>
                    <div className="text-[10px] text-muted-foreground">{c.video_count} vid{c.video_count === 1 ? "" : "s"}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Deals */}
        {deals.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Tag className="h-4 w-4 text-primary" /> Deals here
            </h2>
            <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {deals.map((d) => (
                <li key={d.id} className="shrink-0 w-48">
                  <Link to="/deals/$id" params={{ id: d.id }} className="block overflow-hidden rounded-2xl bg-card ring-1 ring-border">
                    <div className="relative aspect-[4/3] w-full bg-muted">
                      {d.image_url ? <img src={d.image_url} alt={d.title} className="h-full w-full object-cover" /> : null}
                      {d.discount_label && (
                        <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          {d.discount_label}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <div className="line-clamp-2 text-xs font-semibold">{d.title}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Videos */}
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Videos</h2>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && videos.length === 0 && (
            <p className="text-sm text-muted-foreground">No videos here yet.</p>
          )}
          <ul className="grid grid-cols-2 gap-3">
          {videos.map((v: any) => (
            <li key={v.id}>
              <Link to="/" search={{ v: v.id } as any} className="group block overflow-hidden rounded-2xl bg-card">
                <div className="relative aspect-[9/14] w-full bg-muted">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 text-white">
                    <div className="line-clamp-2 text-xs font-medium">{v.title}</div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-white/75">
                      <Heart className="h-3 w-3" /> {v.like_count}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
          </ul>
        </section>
      </div>
    </MobileShell>
  );
}
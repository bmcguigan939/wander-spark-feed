import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Heart, Bookmark, UserPlus, CalendarClock, FileText, Upload, ChevronRight } from "lucide-react";
import { getStudioOverview } from "@/lib/studio.functions";
import { AgreementBanner } from "@/components/AgreementBanner";

export const Route = createFileRoute("/studio/")({
  head: () => ({ meta: [{ title: "Overview — Travidz Studio" }] }),
  component: OverviewPage,
});

function fmt(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}

function OverviewPage() {
  const fn = useServerFn(getStudioOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["studio-overview"],
    queryFn: () => fn({ data: undefined as any }),
  });

  if (isLoading) {
    return <div className="px-5 pt-6 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!data) return null;

  const kpis = [
    { label: "Views", value: data.kpis.views7d, Icon: Eye },
    { label: "Likes", value: data.kpis.likes7d, Icon: Heart },
    { label: "Saves", value: data.kpis.saves7d, Icon: Bookmark },
    { label: "Followers", value: data.kpis.followers7d, Icon: UserPlus },
  ];

  const totalContent = Object.values(data.counts).reduce((s, n) => s + (n as number), 0);

  return (
    <div className="pb-24 pt-2">
      <AgreementBanner kind="creator" />
      <div className="px-5 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Last 7 days</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(({ label, value, Icon }) => (
          <div key={label} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 font-display text-2xl font-semibold">{fmt(value as number)}</div>
          </div>
        ))}
      </div>

      <h3 className="mt-8 mb-3 font-display text-base font-semibold">Content health</h3>
      <div className="flex flex-wrap gap-2">
        {(["live", "scheduled", "draft", "processing", "hidden"] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold capitalize">
            <span className="text-muted-foreground">{k}</span>
            <span>{data.counts[k] ?? 0}</span>
          </span>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Up next</h3>
        <Link to="/studio/schedule" className="text-xs font-semibold text-primary">View schedule →</Link>
      </div>
      {data.queue.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          {totalContent === 0 ? (
            <>
              <p className="text-sm font-semibold">No videos yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Upload your first travel clip to get started.</p>
              <Link to="/create" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft">
                <Upload className="h-3.5 w-3.5" /> Upload now
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing in your queue. Schedule a video or save drafts to plan ahead.</p>
          )}
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {data.queue.map((v) => (
            <li key={v.id}>
              <Link
                to="/studio/videos/$id"
                params={{ id: v.id }}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 transition hover:border-primary/60"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{v.title || "Untitled"}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {v.kind === "draft" ? (
                      <><FileText className="h-3 w-3" /> Draft</>
                    ) : v.kind === "scheduled" && v.scheduled_at ? (
                      <><CalendarClock className="h-3 w-3" /> {new Date(v.scheduled_at).toLocaleString()}</>
                    ) : (
                      <>Queued</>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, FileText, Send, Upload } from "lucide-react";
import { ScheduleSheet } from "@/components/studio/ScheduleSheet";
import {
  listMyVideos,
  publishVideoNow,
  scheduleVideo,
  type StudioVideo,
} from "@/lib/studio.functions";

export const Route = createFileRoute("/studio/schedule")({
  head: () => ({ meta: [{ title: "Schedule — Travidz Studio" }] }),
  component: SchedulePage,
});

function bucketFor(iso: string | null): "today" | "tomorrow" | "week" | "later" | "draft" {
  if (!iso) return "draft";
  const t = new Date(iso).getTime();
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTomorrow = startToday + 86_400_000;
  const startWeek = startToday + 7 * 86_400_000;
  if (t < startTomorrow) return "today";
  if (t < startTomorrow + 86_400_000) return "tomorrow";
  if (t < startWeek) return "week";
  return "later";
}

const GROUP_LABELS: Record<string, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  week: "This week",
  later: "Later",
  draft: "Drafts",
};

function SchedulePage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyVideos);
  const scheduleFn = useServerFn(scheduleVideo);
  const publishFn = useServerFn(publishVideoNow);

  const scheduledQ = useQuery({
    queryKey: ["studio-videos", "scheduled", ""],
    queryFn: () => listFn({ data: { filter: "scheduled" } }),
  });
  const draftQ = useQuery({
    queryKey: ["studio-videos", "draft", ""],
    queryFn: () => listFn({ data: { filter: "draft" } }),
  });

  const [target, setTarget] = useState<StudioVideo | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["studio-videos"] });
    qc.invalidateQueries({ queryKey: ["studio-overview"] });
    qc.invalidateQueries({ queryKey: ["feed"] });
  };

  const scheduleM = useMutation({
    mutationFn: ({ videoId, scheduledAt }: { videoId: string; scheduledAt: string | null }) =>
      scheduleFn({ data: { videoId, scheduledAt } }),
    onSuccess: () => { invalidate(); setTarget(null); toast("Saved"); },
    onError: (e: any) => toast(e.message ?? "Failed"),
  });
  const publishM = useMutation({
    mutationFn: (videoId: string) => publishFn({ data: { videoId } }),
    onSuccess: () => { invalidate(); toast("Published"); },
    onError: (e: any) => toast(e.message ?? "Failed"),
  });

  const grouped = useMemo(() => {
    const items: StudioVideo[] = [
      ...(scheduledQ.data?.videos ?? []),
      ...(draftQ.data?.videos ?? []),
    ];
    const map = new Map<string, StudioVideo[]>();
    for (const v of items) {
      const k = bucketFor(v.scheduled_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(v);
    }
    return ["today", "tomorrow", "week", "later", "draft"]
      .map((k) => ({ key: k, items: (map.get(k) ?? []).sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "")) }))
      .filter((g) => g.items.length > 0);
  }, [scheduledQ.data, draftQ.data]);

  if (scheduledQ.isLoading || draftQ.isLoading) {
    return <div className="px-5 pt-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (grouped.length === 0) {
    return (
      <div className="px-5 pb-24 pt-6">
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <CalendarClock className="mx-auto mb-3 h-8 w-8 text-primary" />
          <p className="text-sm font-semibold">Nothing scheduled</p>
          <p className="mt-1 text-xs text-muted-foreground">Schedule a video from your library, or upload something new.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link to="/studio/videos" search={{ filter: "all" }} className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold">My videos</Link>
            <Link to="/create" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft">
              <Upload className="h-3.5 w-3.5" /> Upload
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-24 pt-6">
      {grouped.map((g) => (
        <div key={g.key} className="mb-8">
          <h3 className="mb-3 font-display text-base font-semibold">{GROUP_LABELS[g.key]}</h3>
          <ul className="space-y-3">
            {g.items.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3">
                <Link to="/studio/videos/$id" params={{ id: v.id }} className="block h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" /> : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to="/studio/videos/$id" params={{ id: v.id }} className="block truncate text-sm font-semibold">
                    {v.title || "Untitled"}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    {v.scheduled_at ? (
                      <><CalendarClock className="h-3 w-3" /> {new Date(v.scheduled_at).toLocaleString()}</>
                    ) : (
                      <><FileText className="h-3 w-3" /> Draft</>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setTarget(v)}
                    className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold"
                  >
                    {v.scheduled_at ? "Reschedule" : "Schedule"}
                  </button>
                  {v.status === "ready" && (
                    <button
                      onClick={() => publishM.mutate(v.id)}
                      className="inline-flex items-center justify-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-soft"
                    >
                      <Send className="h-3 w-3" /> Publish
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <ScheduleSheet
        open={!!target}
        onOpenChange={(v) => { if (!v) setTarget(null); }}
        currentScheduledAt={target?.scheduled_at ?? null}
        saving={scheduleM.isPending}
        onSave={(iso) => target && scheduleM.mutate({ videoId: target.id, scheduledAt: iso })}
      />
    </div>
  );
}
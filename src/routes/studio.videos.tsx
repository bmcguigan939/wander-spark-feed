import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  MoreHorizontal,
  Eye,
  Heart,
  Bookmark,
  CalendarClock,
  FileText,
  Trash2,
  Send,
  Upload,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScheduleSheet } from "@/components/studio/ScheduleSheet";
import {
  listMyVideos,
  publishVideoNow,
  scheduleVideo,
  setVideoDraft,
  type StudioVideo,
} from "@/lib/studio.functions";
import { reconcileMyStuckUploads } from "@/lib/mux.functions";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformStyle } from "@/lib/platform-style";
import { Instagram, Youtube, Facebook, Twitter, Music2, Video as VideoIcon } from "lucide-react";

type Filter = "all" | "live" | "scheduled" | "draft" | "processing";

export const Route = createFileRoute("/studio/videos")({
  head: () => ({ meta: [{ title: "My videos — Travidz Studio" }] }),
  validateSearch: (s: Record<string, unknown>): { filter: Filter; q?: string } => ({
    filter: (["all", "live", "scheduled", "draft", "processing"].includes(s.filter as string)
      ? (s.filter as Filter)
      : "all"),
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  component: VideosPage,
});

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "scheduled", label: "Scheduled" },
  { key: "draft", label: "Drafts" },
  { key: "processing", label: "Processing" },
];

function StateBadge({ s }: { s: StudioVideo["derived_state"] }) {
  const map: Record<StudioVideo["derived_state"], { label: string; cls: string }> = {
    live: { label: "Live", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    scheduled: { label: "Scheduled", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    processing: { label: "Processing", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
    hidden: { label: "Hidden", cls: "bg-destructive/15 text-destructive" },
  };
  const m = map[s];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${m.cls}`}>{m.label}</span>;
}

function VideosPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyVideos);
  const draftFn = useServerFn(setVideoDraft);
  const scheduleFn = useServerFn(scheduleVideo);
  const publishFn = useServerFn(publishVideoNow);
  const reconcileFn = useServerFn(reconcileMyStuckUploads);

  const [qInput, setQInput] = useState(search.q ?? "");
  const [qDebounced, setQDebounced] = useState(search.q ?? "");
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["studio-videos", search.filter, qDebounced],
    queryFn: () => listFn({ data: { filter: search.filter, q: qDebounced || undefined } }),
  });

  const [scheduleTarget, setScheduleTarget] = useState<StudioVideo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudioVideo | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["studio-videos"] });
    qc.invalidateQueries({ queryKey: ["studio-overview"] });
    qc.invalidateQueries({ queryKey: ["feed"] });
  };

  const publishM = useMutation({
    mutationFn: (videoId: string) => publishFn({ data: { videoId } }),
    onSuccess: () => { invalidate(); toast("Published"); },
    onError: (e: any) => toast(e.message ?? "Failed"),
  });
  const draftM = useMutation({
    mutationFn: ({ videoId, isDraft }: { videoId: string; isDraft: boolean }) =>
      draftFn({ data: { videoId, isDraft } }),
    onSuccess: (_d, v) => { invalidate(); toast(v.isDraft ? "Moved to drafts" : "Published"); },
    onError: (e: any) => toast(e.message ?? "Failed"),
  });
  const scheduleM = useMutation({
    mutationFn: ({ videoId, scheduledAt }: { videoId: string; scheduledAt: string | null }) =>
      scheduleFn({ data: { videoId, scheduledAt } }),
    onSuccess: (_d, v) => { invalidate(); setScheduleTarget(null); toast(v.scheduledAt ? "Scheduled" : "Schedule cleared"); },
    onError: (e: any) => toast(e.message ?? "Failed"),
  });
  const deleteM = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase.from("videos").delete().eq("id", videoId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast("Deleted"); },
    onError: (e: any) => toast(e.message ?? "Failed"),
  });
  const reconcileM = useMutation({
    mutationFn: () => reconcileFn(),
    onSuccess: (r) => {
      invalidate();
      if (r.checked === 0) toast("Nothing to refresh");
      else if (r.repaired > 0) toast(`Updated ${r.repaired} video${r.repaired === 1 ? "" : "s"}`);
      else if (r.failed > 0) toast(`${r.failed} upload${r.failed === 1 ? "" : "s"} didn't make it — re-upload to retry`);
      else toast("Still waiting on the video service");
    },
    onError: (e: any) => toast(e.message ?? "Couldn't refresh"),
  });

  const counts = data?.counts ?? { all: 0, live: 0, scheduled: 0, draft: 0, processing: 0, hidden: 0 };
  const videos = data?.videos ?? [];

  return (
    <div className="px-5 pb-24 pt-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={qInput}
          onChange={(e) => {
            setQInput(e.target.value);
            navigate({ to: "/studio/videos", search: { filter: search.filter, q: e.target.value || undefined } });
          }}
          placeholder="Search your videos"
          className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm"
        />
      </div>

      <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const active = search.filter === f.key;
          const count = (counts as any)[f.key] ?? 0;
          return (
            <button
              key={f.key}
              onClick={() => navigate({ to: "/studio/videos", search: { filter: f.key, q: search.q } })}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {f.label} <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {counts.processing > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">
            {counts.processing} video{counts.processing === 1 ? "" : "s"} still processing. Tap refresh if it's been a while.
          </p>
          <button
            onClick={() => reconcileM.mutate()}
            disabled={reconcileM.isPending}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${reconcileM.isPending ? "animate-spin" : ""}`} />
            {reconcileM.isPending ? "Refreshing…" : "Refresh status"}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 text-sm text-muted-foreground">Loading…</div>
      ) : videos.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold">No videos here</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {search.filter === "all" ? "Upload your first travel clip." : `Nothing in “${search.filter}”.`}
          </p>
          <Link to="/create" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft">
            <Upload className="h-3.5 w-3.5" /> Upload
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {videos.map((v) => (
            <li key={v.id} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3">
              <Link to="/studio/videos/$id" params={{ id: v.id }} className="block h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
                <Thumb thumbnail={v.thumbnail_url} platform={v.source_platform} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <Link to="/studio/videos/$id" params={{ id: v.id }} className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {v.title || "Untitled"}
                  </Link>
                  <StateBadge s={v.derived_state} />
                </div>
                {v.derived_state === "scheduled" && v.scheduled_at ? (
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CalendarClock className="h-3 w-3" /> {new Date(v.scheduled_at).toLocaleString()}
                  </div>
                ) : v.derived_state === "draft" ? (
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <FileText className="h-3 w-3" /> Draft
                  </div>
                ) : null}
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {v.view_count}</span>
                  <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {v.like_count}</span>
                  <span className="inline-flex items-center gap-1"><Bookmark className="h-3 w-3" /> {v.save_count}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/studio/videos/$id" params={{ id: v.id }} className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" /> View insights
                    </Link>
                  </DropdownMenuItem>
                  {v.derived_state !== "live" && v.status === "ready" && (
                    <DropdownMenuItem onSelect={() => publishM.mutate(v.id)}>
                      <Send className="mr-2 h-4 w-4" /> Publish now
                    </DropdownMenuItem>
                  )}
                  {!v.is_draft ? (
                    <DropdownMenuItem onSelect={() => draftM.mutate({ videoId: v.id, isDraft: true })}>
                      <FileText className="mr-2 h-4 w-4" /> Move to drafts
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => draftM.mutate({ videoId: v.id, isDraft: false })}>
                      <Send className="mr-2 h-4 w-4" /> Publish draft
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => setScheduleTarget(v)}>
                    <CalendarClock className="mr-2 h-4 w-4" /> {v.scheduled_at ? "Reschedule…" : "Schedule…"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setDeleteTarget(v)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <ScheduleSheet
        open={!!scheduleTarget}
        onOpenChange={(v) => { if (!v) setScheduleTarget(null); }}
        currentScheduledAt={scheduleTarget?.scheduled_at ?? null}
        saving={scheduleM.isPending}
        onSave={(iso) => scheduleTarget && scheduleM.mutate({ videoId: scheduleTarget.id, scheduledAt: iso })}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this video?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “{deleteTarget?.title}” and all its stats. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteM.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Thumb({ thumbnail, platform }: { thumbnail: string | null; platform: string | null }) {
  if (thumbnail) return <img src={thumbnail} alt="" className="h-full w-full object-cover" />;
  const style = getPlatformStyle(platform);
  const p = (platform ?? "").toLowerCase();
  const Icon = p === "instagram" ? Instagram
    : p === "youtube" ? Youtube
    : p === "facebook" ? Facebook
    : p === "tiktok" ? Music2
    : p === "x" || p === "twitter" ? Twitter
    : VideoIcon;
  return (
    <div className={`flex h-full w-full items-center justify-center ${style.gradient}`}>
      <Icon className="h-6 w-6 text-white/90" />
    </div>
  );
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Eye,
  Heart,
  Bookmark,
  MessageCircle,
  Clock3,
  MousePointerClick,
  CalendarClock,
  FileText,
  Send,
  Trash2,
  Building2,
  Plus,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
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
import { TagBusinessSheet } from "@/components/studio/TagBusinessSheet";
import {
  getVideoInsights,
  publishVideoNow,
  scheduleVideo,
  setVideoDraft,
} from "@/lib/studio.functions";
import { listInvitesForVideo, revokeInvite } from "@/lib/business-invites.functions";
import { COMMISSION } from "@/lib/commission";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/studio/videos/$id")({
  head: () => ({ meta: [{ title: "Video insights — Travidz Studio" }] }),
  component: InsightsPage,
});

function fmtMs(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function InsightsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const insightsFn = useServerFn(getVideoInsights);
  const draftFn = useServerFn(setVideoDraft);
  const scheduleFn = useServerFn(scheduleVideo);
  const publishFn = useServerFn(publishVideoNow);

  const { data, isLoading } = useQuery({
    queryKey: ["studio-insights", id],
    queryFn: () => insightsFn({ data: { videoId: id, days: 14 } }),
  });

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["studio-insights", id] });
    qc.invalidateQueries({ queryKey: ["studio-videos"] });
    qc.invalidateQueries({ queryKey: ["studio-overview"] });
    qc.invalidateQueries({ queryKey: ["feed"] });
  };

  const publishM = useMutation({
    mutationFn: () => publishFn({ data: { videoId: id } }),
    onSuccess: () => { invalidate(); toast("Published"); },
    onError: (e: any) => toast(e.message ?? "Failed"),
  });
  const draftM = useMutation({
    mutationFn: (isDraft: boolean) => draftFn({ data: { videoId: id, isDraft } }),
    onSuccess: (_d, v) => { invalidate(); toast(v ? "Moved to drafts" : "Published"); },
    onError: (e: any) => toast(e.message ?? "Failed"),
  });
  const scheduleM = useMutation({
    mutationFn: (scheduledAt: string | null) => scheduleFn({ data: { videoId: id, scheduledAt } }),
    onSuccess: () => { invalidate(); setScheduleOpen(false); toast("Saved"); },
    onError: (e: any) => toast(e.message ?? "Failed"),
  });
  const deleteM = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("videos").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { invalidate(); toast("Deleted"); navigate({ to: "/studio/videos", search: { filter: "all" } }); },
    onError: (e: any) => toast(e.message ?? "Failed"),
  });

  if (isLoading) {
    return <div className="px-5 pt-6 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!data) return null;

  const v = data.video;
  const t = data.totals;

  const tiles = [
    { label: "Views", value: t.views.toLocaleString(), Icon: Eye },
    { label: "Likes", value: t.likes.toLocaleString(), Icon: Heart },
    { label: "Saves", value: t.saves.toLocaleString(), Icon: Bookmark },
    { label: "Comments", value: v.comment_count.toLocaleString(), Icon: MessageCircle },
    { label: "Watch time", value: fmtMs(t.watchMs), Icon: Clock3 },
    { label: "Deal clicks", value: t.dealClicks.toLocaleString(), Icon: MousePointerClick },
  ];

  return (
    <div className="px-5 pb-32 pt-4">
      <Link to="/studio/videos" search={{ filter: "all" }} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to videos
      </Link>

      <div className="mt-4 flex gap-3 rounded-2xl border border-border/60 bg-card p-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
          {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{v.title || "Untitled"}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{v.derived_state}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Posted {new Date(v.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {tiles.map(({ label, value, Icon }) => (
          <div key={label} className="rounded-2xl border border-border/60 bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="mt-1.5 font-display text-base font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <h3 className="mt-8 mb-2 font-display text-base font-semibold">Last 14 days</h3>
      <div className="h-44 rounded-2xl border border-border/60 bg-card p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
              labelFormatter={(d) => new Date(d as string).toLocaleDateString()}
            />
            <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#gv)" strokeWidth={2} />
            <Area type="monotone" dataKey="likes" stroke="hsl(var(--foreground))" fill="transparent" strokeWidth={1.5} />
            <Area type="monotone" dataKey="saves" stroke="hsl(var(--muted-foreground))" fill="transparent" strokeWidth={1.5} strokeDasharray="3 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-primary" /> Views</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-foreground" /> Likes</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-muted-foreground" /> Saves</span>
      </div>

      <h3 className="mt-8 mb-3 font-display text-base font-semibold">Recent comments</h3>
      {data.recentComments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {data.recentComments.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-2xl border border-border/60 bg-card p-3">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-secondary">
                {c.user?.avatar_url ? <img src={c.user.avatar_url} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold">{c.user?.display_name || c.user?.username || "User"}</span>
                  <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-0.5 text-sm">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-16 z-10 mx-auto max-w-md px-5 pb-3">
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/90 p-1.5 shadow-soft backdrop-blur-xl">
          {v.derived_state !== "live" && (
            <button onClick={() => publishM.mutate()} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              <Send className="h-3.5 w-3.5" /> Publish
            </button>
          )}
          {!v.derived_state.includes("draft") ? (
            <button onClick={() => draftM.mutate(true)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">
              <FileText className="h-3.5 w-3.5" /> Draft
            </button>
          ) : null}
          <button onClick={() => setScheduleOpen(true)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">
            <CalendarClock className="h-3.5 w-3.5" /> Schedule
          </button>
          <button onClick={() => setDeleteOpen(true)} aria-label="Delete" className="rounded-full p-2 text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ScheduleSheet
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        currentScheduledAt={null}
        saving={scheduleM.isPending}
        onSave={(iso) => scheduleM.mutate(iso)}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this video?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the video and all its stats.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteM.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
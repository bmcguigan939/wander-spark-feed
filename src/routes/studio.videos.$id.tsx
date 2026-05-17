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
  Sparkles,
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
import { draftInviteEmail } from "@/lib/outreach.functions";
import {
  listSuggestionsForVideo,
  dismissSuggestion,
  markSuggestionConverted,
} from "@/lib/business-suggestions.functions";
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
  const [tagOpen, setTagOpen] = useState(false);
  const [tagInitial, setTagInitial] = useState<{
    businessName?: string;
    websiteUrl?: string;
    city?: string;
    suggestionId?: string;
  } | null>(null);

  const invitesFn = useServerFn(listInvitesForVideo);
  const revokeFn = useServerFn(revokeInvite);
  const { data: invites } = useQuery({
    queryKey: ["business-invites", id],
    queryFn: () => invitesFn({ data: { videoId: id } }),
  });
  const revokeM = useMutation({
    mutationFn: (inviteId: string) => revokeFn({ data: { inviteId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-invites", id] });
      toast("Invite removed");
    },
  });

  const suggestionsFn = useServerFn(listSuggestionsForVideo);
  const dismissFn = useServerFn(dismissSuggestion);
  const markConvertedFn = useServerFn(markSuggestionConverted);
  const { data: suggestions } = useQuery({
    queryKey: ["business-suggestions", id],
    queryFn: () => suggestionsFn({ data: { videoId: id } }),
  });
  const dismissM = useMutation({
    mutationFn: (sid: string) => dismissFn({ data: { id: sid } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business-suggestions", id] }),
  });

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

      <div className="mt-8 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Businesses featured</h3>
        <button
          onClick={() => { setTagInitial(null); setTagOpen(true); }}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft"
        >
          <Plus className="h-3.5 w-3.5" /> Tag a business
        </button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Invite businesses you featured. They get a {COMMISSION.totalPct}% offer; you earn on every sale.
      </p>
      {suggestions && suggestions.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3 w-3" /> AI-detected from this video
          </div>
          <ul className="space-y-2">
            {suggestions.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-xl bg-background/70 p-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{s.name}</span>
                    {s.category ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {s.category}
                      </span>
                    ) : null}
                  </div>
                  {s.website_guess || s.city ? (
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {s.website_guess ?? ""}{s.website_guess && s.city ? " · " : ""}{s.city ?? ""}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTagInitial({
                      businessName: s.name,
                      websiteUrl: s.website_guess ?? "",
                      city: s.city ?? "",
                      suggestionId: s.id,
                    });
                    setTagOpen(true);
                  }}
                  className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground"
                >
                  Tag
                </button>
                <button
                  type="button"
                  onClick={() => dismissM.mutate(s.id)}
                  aria-label="Dismiss"
                  className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {!invites?.length ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-card/40 p-5 text-center text-sm text-muted-foreground">
          No invites yet. Tag a business to start earning on this video.
        </div>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {invites.map((inv) => {
            const inviteUrl =
              typeof window !== "undefined"
                ? `${window.location.origin}/business/invite/${inv.token}`
                : "";
            const StatusIcon =
              inv.status === "accepted"
                ? CheckCircle2
                : inv.status === "declined" || inv.status === "expired"
                ? XCircle
                : Clock;
            const statusColor =
              inv.status === "accepted"
                ? "text-emerald-600 bg-emerald-500/10"
                : inv.status === "pending"
                ? "text-amber-600 bg-amber-500/10"
                : "text-muted-foreground bg-muted";
            return (
              <li key={inv.id} className="rounded-2xl border border-border bg-card p-3 shadow-soft">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{inv.business_name}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${statusColor}`}
                      >
                        <StatusIcon className="h-2.5 w-2.5" />
                        {inv.status}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {inv.website_url}
                    </div>
                  </div>
                </div>
                {inv.status === "pending" ? (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteUrl);
                        toast("Invite link copied");
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background py-1.5 text-[11px] font-semibold"
                    >
                      <Copy className="h-3 w-3" /> Copy invite link
                    </button>
                    <a
                      href={`mailto:${inv.contact_email}?subject=${encodeURIComponent(`Featured you on Travidz`)}&body=${encodeURIComponent(`Hi — I featured ${inv.business_name} in a Travidz video and would love to advertise your direct website on the platform for a ${COMMISSION.totalPct}% commission on any sales directed through us. No setup fee, no monthly cost.\n\nClaim your listing in one click: ${inviteUrl}`)}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                    >
                      Email
                    </a>
                    <DraftEmailButton inviteId={inv.id} email={inv.contact_email} />
                    <button
                      type="button"
                      onClick={() => revokeM.mutate(inv.id)}
                      aria-label="Revoke"
                      className="rounded-full border border-destructive/30 bg-destructive/5 p-1.5 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

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

      <TagBusinessSheet
        videoId={id}
        open={tagOpen}
        onOpenChange={setTagOpen}
        initial={tagInitial}
        onCreated={(inviteId) => {
          if (tagInitial?.suggestionId) {
            markConvertedFn({ data: { id: tagInitial.suggestionId, inviteId } })
              .then(() => qc.invalidateQueries({ queryKey: ["business-suggestions", id] }))
              .catch(() => {});
          }
        }}
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
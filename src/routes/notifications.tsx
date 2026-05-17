import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell } from "@/components/layout/BottomNav";
import { listNotifications, markAllRead, type NotificationRow } from "@/lib/notifications.functions";
import { useAuth } from "@/lib/auth";
import { Bell, Heart, MessageCircle, UserPlus, Reply, Briefcase, CheckCircle2, Wallet, XCircle, Clock4, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Travidz" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listNotifications);
  const markFn = useServerFn(markAllRead);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", user?.id ?? null],
    queryFn: () => listFn({ data: undefined as any }),
    enabled: !!user,
  });

  const markM = useMutation({
    mutationFn: () => markFn({ data: undefined as any }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notif-unread"] });
    },
  });

  // Auto-mark as read on view
  useEffect(() => {
    if (user && data?.notifications?.some((n) => !n.read_at)) markM.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, data?.notifications?.length]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-page:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  return (
    <MobileShell>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/85 px-5 py-4 backdrop-blur-xl">
        <h1 className="text-lg font-bold">Notifications</h1>
      </header>
      <div className="px-2">
        {isLoading && <p className="px-3 py-10 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (data?.notifications.length ?? 0) === 0 && (
          <div className="flex flex-col items-center px-6 pt-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Bell className="h-7 w-7" />
            </div>
            <h2 className="text-base font-semibold">No notifications yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">When people interact with your videos, you'll see it here.</p>
          </div>
        )}
        <ul className="divide-y divide-border">
          {data?.notifications.map((n) => <Item key={n.id} n={n} />)}
        </ul>
      </div>
    </MobileShell>
  );
}

function Item({ n }: { n: NotificationRow }) {
  const meta = describe(n);
  const actorName = n.actor?.display_name || (n.actor ? `@${n.actor.username}` : "Someone");
  const href = hrefFor(n);
  return (
    <Link to={href} className={`flex items-center gap-3 px-3 py-3 ${n.read_at ? "" : "bg-primary/5"}`}>
      <div className="relative">
        <img
          src={n.actor?.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(n.actor?.username ?? "u")}`}
          alt=""
          className="h-10 w-10 rounded-full border border-border object-cover"
        />
        <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ${meta.bg} text-white`}>
          <meta.Icon className="h-3 w-3" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm"><b>{actorName}</b> <span className="text-muted-foreground">{meta.text}</span></p>
        <p className="text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
      </div>
      {n.video?.thumbnail_url && (
        <img src={n.video.thumbnail_url} alt="" className="h-12 w-9 flex-shrink-0 rounded object-cover" />
      )}
    </Link>
  );
}

function hrefFor(n: NotificationRow): string {
  switch (n.type) {
    case "redemption_confirmed":
      return "/creator/earnings";
    case "redemption_rejected":
      return n.deal_id ? `/deals/${n.deal_id}` : "/";
    case "deal_expiring_soon":
      return n.deal_id ? `/business/deals/${n.deal_id}` : "/business";
    case "deal_application":
      return "/business/applications";
    case "deal_application_decided":
      return "/creator/applications";
    case "business_invite_received":
      return "/business";
    default:
      if (n.video_id) return `/?v=${n.video_id}`;
      if (n.actor) return `/u/${n.actor.username}`;
      return "/";
  }
}

function describe(n: NotificationRow) {
  switch (n.type) {
    case "like": return { text: "liked your video", Icon: Heart, bg: "bg-rose-500" };
    case "comment": return { text: "commented on your video", Icon: MessageCircle, bg: "bg-sky-500" };
    case "follow": return { text: "started following you", Icon: UserPlus, bg: "bg-emerald-500" };
    case "reply": return { text: "replied to your comment", Icon: Reply, bg: "bg-violet-500" };
    case "deal_application": return { text: "applied to promote your deal", Icon: Briefcase, bg: "bg-amber-500" };
    case "deal_application_decided": return { text: "updated your deal application", Icon: CheckCircle2, bg: "bg-primary" };
    case "business_invite_received": return { text: "invited you to add a deal", Icon: Building2, bg: "bg-amber-500" };
    case "redemption_confirmed": return { text: "confirmed a booking — commission added", Icon: Wallet, bg: "bg-emerald-500" };
    case "redemption_rejected": return { text: "couldn't confirm your booking", Icon: XCircle, bg: "bg-rose-500" };
    case "deal_expiring_soon": return { text: "your deal expires within 7 days", Icon: Clock4, bg: "bg-amber-500" };
    default: return { text: "", Icon: Bell, bg: "bg-muted" };
  }
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { becomeCreator } from "@/lib/mux.functions";
import { useAuth } from "@/lib/auth";
import { Settings, LogOut, Video, Heart, Bookmark, Sparkles, Briefcase, Wand2, Send, CheckCircle2, BarChart3, Map, Shield, Clapperboard, Link2, Youtube, Instagram, Globe } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { rerunAutoTag, applyAiSuggestedTitle } from "@/lib/ai.functions";
import { CinematicHeader } from "@/components/ui/cinematic";
import { getMySocials, upsertMySocials } from "@/lib/social.functions";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Travidz" }] }),
  component: ProfilePage,
});

type Tab = "videos" | "collections" | "liked";

function ProfilePage() {
  const { user, loading, signOut, refreshRoles, isCreator, isBusiness, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateMyProfile);
  const becomeFn = useServerFn(becomeCreator);
  const rerunFn = useServerFn(rerunAutoTag);
  const applyTitleFn = useServerFn(applyAiSuggestedTitle);
  const getSocialsFn = useServerFn(getMySocials);
  const upsertSocialsFn = useServerFn(upsertMySocials);
  const rerunM = useMutation({
    mutationFn: (videoId: string) => rerunFn({ data: { videoId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-profile"] }); toast("Re-tagged with AI"); },
    onError: (e: any) => toast(e?.message ?? "Failed to re-tag"),
  });
  const applyTitleM = useMutation({
    mutationFn: (videoId: string) => applyTitleFn({ data: { videoId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-profile"] }); toast("Title updated"); },
    onError: (e: any) => toast(e?.message ?? "Failed to apply title"),
  });

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getFn({ data: undefined as any }),
    enabled: !!user,
  });
  const [tab, setTab] = useState<Tab>("videos");
  const [editOpen, setEditOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [socialsOpen, setSocialsOpen] = useState(false);
  const [socials, setSocials] = useState({
    youtube_handle: "",
    tiktok_handle: "",
    instagram_handle: "",
    x_handle: "",
    website_url: "",
  });

  const socialsQ = useQuery({
    queryKey: ["my-socials"],
    queryFn: () => getSocialsFn({ data: undefined as any }),
    enabled: !!user,
  });
  useEffect(() => {
    if (socialsQ.data) {
      setSocials({
        youtube_handle: socialsQ.data.youtube_handle ?? "",
        tiktok_handle: socialsQ.data.tiktok_handle ?? "",
        instagram_handle: socialsQ.data.instagram_handle ?? "",
        x_handle: socialsQ.data.x_handle ?? "",
        website_url: socialsQ.data.website_url ?? "",
      });
    }
  }, [socialsQ.data]);
  const saveSocialsM = useMutation({
    mutationFn: () => upsertSocialsFn({ data: socials as any }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-socials"] });
      setSocialsOpen(false);
      toast("Social links saved");
    },
    onError: (e: any) => toast(e?.message ?? "Couldn't save links"),
  });

  const updateM = useMutation({
    mutationFn: () => updateFn({ data: { display_name: displayName || undefined, bio: bio || undefined } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-profile"] }); setEditOpen(false); toast("Profile updated"); },
  });
  const becomeM = useMutation({
    mutationFn: () => becomeFn({ data: undefined as any }),
    onSuccess: () => { refreshRoles(); toast("You're a creator now"); },
    onError: (e: any) => toast(e?.message ?? "Couldn't enable creator mode"),
  });

  function handleSignOut() {
    if (typeof window !== "undefined" && !window.confirm("Sign out of Travidz?")) return;
    signOut();
  }

  function openEdit() {
    setDisplayName(data?.profile?.display_name ?? "");
    setBio(data?.profile?.bio ?? "");
    setEditOpen(true);
  }

  if (!user || isLoading || !data?.profile) return <MobileShell><div className="px-5 pt-10 text-sm text-muted-foreground">Loading…</div></MobileShell>;
  const p = data.profile;

  return (
    <MobileShell>
      <CinematicHeader
        height="h-56"
        image={p.avatar_url ?? null}
        eyebrow={data.roles.join(" · ")}
        title={<span>@{p.username}</span>}
        subtitle={p.display_name}
        trailing={
          <button
            onClick={openEdit}
            aria-label="Edit profile"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
          >
            <Settings className="h-4 w-4" />
          </button>
        }
      />
      <div className="px-5 pt-5">
        <div className="flex items-center gap-4">
          <img
            src={p.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(p.username)}`}
            alt={p.username}
            className="-mt-16 h-24 w-24 rounded-full border-4 border-background object-cover shadow-cinematic"
          />
        </div>
        {p.bio && <p className="mt-4 text-sm text-foreground/90">{p.bio}</p>}
        <div className="mt-5 flex gap-6 text-sm">
          <span><b>{data.followerCount}</b> <span className="text-muted-foreground">followers</span></span>
          <span><b>{data.followingCount}</b> <span className="text-muted-foreground">following</span></span>
          <span><b>{data.videos.length}</b> <span className="text-muted-foreground">videos</span></span>
        </div>
        {!isCreator && (
          <button onClick={() => becomeM.mutate()} disabled={becomeM.isPending}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 py-3 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" /> Become a creator
          </button>
        )}
        <Link
          to={isBusiness ? "/business" : "/business/apply"}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-semibold"
        >
          <Briefcase className="h-4 w-4" /> {isBusiness ? "Business portal" : "List travel deals"}
        </Link>
        <Link
          to="/itineraries"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-semibold"
        >
          <Map className="h-4 w-4" /> My itineraries
        </Link>
        <button
          type="button"
          onClick={() => setSocialsOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-semibold"
        >
          <Link2 className="h-4 w-4" /> Link my socials
        </button>
        <SocialChips s={socialsQ.data ?? null} />
        {isCreator && (
          <Link
            to="/creator/applications"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-semibold"
          >
            <Send className="h-4 w-4" /> My deal applications
          </Link>
        )}
        {isCreator && (
          <Link
            to="/studio"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-aurora py-3 text-sm font-semibold text-white shadow-soft"
          >
            <Clapperboard className="h-4 w-4" /> Creator studio
          </Link>
        )}
        {isCreator && (
          <Link
            to="/creator/analytics"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-semibold"
          >
            <BarChart3 className="h-4 w-4" /> Creator analytics
          </Link>
        )}
        {isAdmin && (
          <Link
            to="/admin"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 py-3 text-sm font-semibold text-primary"
          >
            <Shield className="h-4 w-4" /> Admin dashboard
          </Link>
        )}
        <div className="mt-6 flex gap-1 rounded-full bg-card p-1">
          {([["videos", Video, "Videos"], ["collections", Bookmark, "Saved"], ["liked", Heart, "Liked"]] as const).map(([k, Icon, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        {tab === "videos" && (
          <Grid
            items={data.videos as any}
            emptyMsg={isCreator ? "Upload your first travel video." : "You're not a creator yet."}
            onRerun={isCreator ? (id) => rerunM.mutate(id) : undefined}
            pendingId={rerunM.isPending ? (rerunM.variables as string | undefined) : undefined}
            onApplyTitle={isCreator ? (id) => applyTitleM.mutate(id) : undefined}
            applyTitlePendingId={applyTitleM.isPending ? (applyTitleM.variables as string | undefined) : undefined}
          />
        )}
        {tab === "liked" && <Grid items={data.liked as any} emptyMsg="No likes yet — explore the feed." />}
        {tab === "collections" && <div className="mt-4"><Link to="/collections" className="text-sm font-semibold text-primary">Open collections →</Link></div>}
      </div>
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader><SheetTitle>Edit profile</SheetTitle></SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateM.mutate(); }} className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Display name</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Bio</span>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={280}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </label>
            <button disabled={updateM.isPending} className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">Save</button>
          </form>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-destructive/40 bg-destructive/5 py-3 text-sm font-semibold text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </SheetContent>
      </Sheet>
      <Sheet open={socialsOpen} onOpenChange={setSocialsOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Link your other platforms</SheetTitle>
          </SheetHeader>
          <p className="mt-1 text-xs text-muted-foreground">
            Show your YouTube, TikTok, Instagram and more on your Travidz profile.
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); saveSocialsM.mutate(); }}
            className="mt-4 space-y-3"
          >
            {[
              { key: "youtube_handle", label: "YouTube", icon: Youtube, placeholder: "@yourchannel" },
              { key: "tiktok_handle", label: "TikTok", icon: Video, placeholder: "@yourhandle" },
              { key: "instagram_handle", label: "Instagram", icon: Instagram, placeholder: "@yourhandle" },
              { key: "x_handle", label: "X / Twitter", icon: Link2, placeholder: "@yourhandle" },
              { key: "website_url", label: "Website", icon: Globe, placeholder: "https://…" },
            ].map((f) => (
              <label key={f.key} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                <f.icon className="h-4 w-4 text-muted-foreground" />
                <span className="w-24 shrink-0 text-xs font-semibold text-muted-foreground">{f.label}</span>
                <input
                  value={(socials as any)[f.key]}
                  onChange={(e) => setSocials((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  maxLength={f.key === "website_url" ? 300 : 80}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                />
              </label>
            ))}
            <button
              disabled={saveSocialsM.isPending}
              className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saveSocialsM.isPending ? "Saving…" : "Save links"}
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              Tip: tap <b>+ Import</b> on Create to pull a specific post over to Travidz.
            </p>
          </form>
        </SheetContent>
      </Sheet>
    </MobileShell>
  );
}

function SocialChips({ s }: { s: { youtube_handle: string | null; tiktok_handle: string | null; instagram_handle: string | null; x_handle: string | null; website_url: string | null } | null }) {
  if (!s) return null;
  const chips: Array<{ label: string; href: string; icon: any }> = [];
  if (s.youtube_handle) chips.push({ label: s.youtube_handle, href: `https://youtube.com/@${s.youtube_handle}`, icon: Youtube });
  if (s.tiktok_handle) chips.push({ label: s.tiktok_handle, href: `https://tiktok.com/@${s.tiktok_handle}`, icon: Video });
  if (s.instagram_handle) chips.push({ label: s.instagram_handle, href: `https://instagram.com/${s.instagram_handle}`, icon: Instagram });
  if (s.x_handle) chips.push({ label: s.x_handle, href: `https://x.com/${s.x_handle}`, icon: Link2 });
  if (s.website_url) chips.push({ label: s.website_url.replace(/^https?:\/\//, ""), href: s.website_url, icon: Globe });
  if (!chips.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <a
          key={c.label}
          href={c.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground/80 hover:text-foreground"
        >
          <c.icon className="h-3 w-3" /> {c.label}
        </a>
      ))}
    </div>
  );
}

function Grid({
  items,
  emptyMsg,
  onRerun,
  pendingId,
  onApplyTitle,
  applyTitlePendingId,
}: {
  items: Array<{ id: string; title: string; thumbnail_url: string | null; status?: string; ai_analyzed_at?: string | null; ai_suggested_title?: string | null }>;
  emptyMsg: string;
  onRerun?: (videoId: string) => void;
  pendingId?: string;
  onApplyTitle?: (videoId: string) => void;
  applyTitlePendingId?: string;
}) {
  if (!items.length) return <p className="mt-10 text-center text-sm text-muted-foreground">{emptyMsg}</p>;
  return (
    <div className="mt-4 grid grid-cols-3 gap-1.5">
      {items.map((v) => (
        <div key={v.id} className="relative aspect-[9/14] overflow-hidden rounded-md bg-card">
          {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">No preview</div>}
          {/* AI status pill */}
          {onRerun && v.status === "ready" && !v.ai_analyzed_at && (
            <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
              <Wand2 className="h-3 w-3 animate-pulse" /> AI…
            </span>
          )}
          {onRerun && v.ai_analyzed_at && !v.ai_suggested_title && (
            <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/80 px-1.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
              <CheckCircle2 className="h-3 w-3" />
            </span>
          )}
          {onApplyTitle && v.ai_suggested_title && (
            <button
              onClick={() => onApplyTitle(v.id)}
              disabled={applyTitlePendingId === v.id}
              title={`Suggested: ${v.ai_suggested_title}`}
              className="absolute inset-x-1 bottom-1 truncate rounded-md bg-primary/85 px-1.5 py-1 text-[10px] font-semibold text-primary-foreground backdrop-blur-md"
            >
              ✨ {applyTitlePendingId === v.id ? "Saving…" : "Use AI title"}
            </button>
          )}
          {onRerun && (
            <button
              onClick={() => onRerun(v.id)}
              disabled={pendingId === v.id}
              aria-label="Re-run AI tagging"
              className="absolute right-1 top-1 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md transition hover:bg-black/75 disabled:opacity-60"
            >
              <Wand2 className="h-3 w-3" />
              {pendingId === v.id ? "…" : "AI"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { becomeCreator } from "@/lib/mux.functions";
import { useAuth } from "@/lib/auth";
import { Settings, LogOut, Video, Heart, Bookmark, Sparkles, Briefcase, Wand2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { rerunAutoTag } from "@/lib/ai.functions";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Travidz" }] }),
  component: ProfilePage,
});

type Tab = "videos" | "collections" | "liked";

function ProfilePage() {
  const { user, loading, signOut, refreshRoles, isCreator, isBusiness } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateMyProfile);
  const becomeFn = useServerFn(becomeCreator);
  const rerunFn = useServerFn(rerunAutoTag);
  const rerunM = useMutation({
    mutationFn: (videoId: string) => rerunFn({ data: { videoId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-profile"] }); toast("Re-tagged with AI"); },
    onError: (e: any) => toast(e?.message ?? "Failed to re-tag"),
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
      <div className="px-5 pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <img src={p.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(p.username)}`}
              alt={p.username} className="h-20 w-20 rounded-full border border-border object-cover" />
            <div>
              <h1 className="text-xl font-bold">@{p.username}</h1>
              {p.display_name && <p className="text-sm text-muted-foreground">{p.display_name}</p>}
              <div className="mt-1 flex gap-1.5">
                {data.roles.map((r) => (
                  <span key={r} className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">{r}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={openEdit} className="rounded-full border border-border bg-card p-2"><Settings className="h-4 w-4" /></button>
          </div>
        </div>
        {p.bio && <p className="mt-4 text-sm">{p.bio}</p>}
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
    </MobileShell>
  );
}

function Grid({
  items,
  emptyMsg,
  onRerun,
  pendingId,
}: {
  items: Array<{ id: string; title: string; thumbnail_url: string | null }>;
  emptyMsg: string;
  onRerun?: (videoId: string) => void;
  pendingId?: string;
}) {
  if (!items.length) return <p className="mt-10 text-center text-sm text-muted-foreground">{emptyMsg}</p>;
  return (
    <div className="mt-4 grid grid-cols-3 gap-1.5">
      {items.map((v) => (
        <div key={v.id} className="relative aspect-[9/14] overflow-hidden rounded-md bg-card">
          {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">No preview</div>}
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

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell } from "@/components/layout/BottomNav";
import { getProfileByUsername } from "@/lib/feed.functions";
import { toggleFollow } from "@/lib/interactions.functions";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Travidz` },
      { name: "description", content: `Travel videos and destinations by @${params.username} on Travidz.` },
      { property: "og:title", content: `@${params.username} on Travidz` },
      { property: "og:description", content: `Travel videos by @${params.username}.` },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const followFn = useServerFn(toggleFollow);
  const { data, isLoading } = useQuery({
    queryKey: ["profile", username, user?.id ?? null],
    queryFn: () => getProfileByUsername({ data: { username, viewerId: user?.id ?? null } }),
  });
  const followM = useMutation({
    mutationFn: () => followFn({ data: { creatorId: data!.profile!.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", username] }),
    onError: (e: any) => toast(e.message ?? "Couldn't update follow"),
  });
  const isSelf = user?.id === data?.profile?.id;

  return (
    <MobileShell>
      <div className="px-5 pt-8">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data && !data.profile && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">No creator at @{username}.</p>
            <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">Back to feed</Link>
          </div>
        )}
        {data?.profile && (
          <>
            <div className="flex items-center gap-4">
              <img
                src={data.profile.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(data.profile.username)}`}
                alt={data.profile.username}
                className="h-20 w-20 rounded-full border border-border object-cover"
              />
              <div>
                <h1 className="text-xl font-bold">@{data.profile.username}</h1>
                {data.profile.display_name && <p className="text-sm text-muted-foreground">{data.profile.display_name}</p>}
              </div>
            </div>
            {data.profile.bio && <p className="mt-4 text-sm">{data.profile.bio}</p>}
            <div className="mt-5 flex gap-6 text-sm">
              <span><b>{data.followerCount}</b> <span className="text-muted-foreground">followers</span></span>
              <span><b>{data.followingCount}</b> <span className="text-muted-foreground">following</span></span>
              <span><b>{data.videos.length}</b> <span className="text-muted-foreground">videos</span></span>
            </div>
            {!isSelf && (
              <button
                onClick={() => {
                  if (!user) { window.location.href = "/login"; return; }
                  followM.mutate();
                }}
                disabled={followM.isPending}
                className={`mt-5 w-full rounded-full py-3 text-sm font-semibold disabled:opacity-50 ${
                  data.isFollowing
                    ? "border border-border bg-card text-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {data.isFollowing ? "Following" : "Follow"}
              </button>
            )}

            <div className="mt-8 grid grid-cols-3 gap-1">
              {data.videos.map((v) => (
                <div key={v.id} className="aspect-[9/14] overflow-hidden rounded-md bg-card">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">No preview</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </MobileShell>
  );
}

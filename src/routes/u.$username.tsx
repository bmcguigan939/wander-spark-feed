import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell } from "@/components/layout/BottomNav";
import { getProfileByUsername } from "@/lib/feed.functions";
import { toggleFollow } from "@/lib/interactions.functions";
import { getPublicSocials } from "@/lib/social.functions";
import { getReviewsForBusiness } from "@/lib/reviews.functions";
import { RatingSummary, StarRow } from "@/components/reviews/RatingSummary";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Instagram, Facebook, Youtube, Music2, Globe, Twitter } from "lucide-react";

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
  const socialsQ = useQuery({
    queryKey: ["public-socials", data?.profile?.id],
    queryFn: () => getPublicSocials({ data: { userId: data!.profile!.id } }),
    enabled: !!data?.profile?.id,
  });
  const isBusiness = !!(data?.profile as any)?.business_name;
  const fetchBizReviews = useServerFn(getReviewsForBusiness);
  const reviewsQ = useQuery({
    queryKey: ["business-reviews", data?.profile?.id],
    queryFn: () => fetchBizReviews({ data: { businessId: data!.profile!.id, limit: 10 } }),
    enabled: !!data?.profile?.id && isBusiness,
  });
  const followM = useMutation({
    mutationFn: () => followFn({ data: { creatorId: data!.profile!.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", username] });
      qc.invalidateQueries({ queryKey: ["my-following"] });
    },
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
                <h1 className="text-xl font-bold flex items-center gap-1.5">
                  @{data.profile.username}
                  {(data.profile as any).is_verified && <VerifiedBadge />}
                </h1>
                {data.profile.display_name && <p className="text-sm text-muted-foreground">{data.profile.display_name}</p>}
              </div>
            </div>
            {data.profile.bio && <p className="mt-4 text-sm">{data.profile.bio}</p>}
            <SocialLinks s={socialsQ.data ?? null} />
            {isBusiness && (
              <div className="mt-4">
                <RatingSummary
                  avg={(data.profile as any).business_rating_avg}
                  count={(data.profile as any).business_rating_count}
                  size="md"
                />
              </div>
            )}
            {!isBusiness && (data.profile as any).creator_rating_count > 0 && (
              <div className="mt-4">
                <RatingSummary
                  avg={(data.profile as any).creator_rating_avg}
                  count={(data.profile as any).creator_rating_count}
                  size="sm"
                />
              </div>
            )}
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
                <Link
                  key={v.id}
                  to="/feed/playlist"
                  search={{ ids: data.videos.map((x) => x.id), start: v.id }}
                  className="aspect-[9/14] overflow-hidden rounded-md bg-card"
                >
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">No preview</div>
                  )}
                </Link>
              ))}
            </div>
            {isBusiness && (
              <BusinessReviewsBlock data={reviewsQ.data} />
            )}
          </>
        )}
      </div>
    </MobileShell>
  );
}

function BusinessReviewsBlock({ data }: { data: any }) {
  if (!data) return null;
  const { reviews, avg, count, distribution } = data;
  if (!count) {
    return (
      <div className="mt-10 border-t border-border pt-6">
        <h2 className="text-base font-semibold">Reviews</h2>
        <p className="mt-2 text-sm text-muted-foreground">No reviews yet — be the first after your trip.</p>
      </div>
    );
  }
  const total = distribution.reduce((a: number, b: number) => a + b, 0) || 1;
  return (
    <div className="mt-10 border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Reviews</h2>
        <RatingSummary avg={avg} count={count} size="sm" />
      </div>
      <div className="mt-4 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star, i) => {
          const c = distribution[i];
          const pct = Math.round((c / total) * 100);
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-muted-foreground">{star}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 text-right text-muted-foreground">{c}</span>
            </div>
          );
        })}
      </div>
      <ul className="mt-6 space-y-5">
        {reviews.map((r: any) => (
          <li key={r.id} className="border-b border-border/60 pb-4 last:border-0">
            <div className="flex items-center gap-2">
              <img
                src={r.user?.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(r.user?.username ?? "u")}`}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="text-xs font-medium">{r.user?.display_name || `@${r.user?.username ?? "traveller"}`}</p>
                <div className="flex items-center gap-2">
                  <StarRow value={r.rating} />
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                    {r.deal?.title ? ` · ${r.deal.title}` : ""}
                  </span>
                </div>
              </div>
            </div>
            {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLinks({ s }: { s: any | null }) {
  if (!s) return null;
  const items: Array<{ label: string; href: string; icon: any }> = [];
  if (s.instagram_handle) items.push({ label: "Instagram", href: `https://instagram.com/${s.instagram_handle}`, icon: Instagram });
  if (s.facebook_handle) items.push({ label: "Facebook", href: `https://facebook.com/${s.facebook_handle}`, icon: Facebook });
  if (s.tiktok_handle) items.push({ label: "TikTok", href: `https://tiktok.com/@${s.tiktok_handle}`, icon: Music2 });
  if (s.youtube_channel_id) items.push({ label: "YouTube", href: `https://youtube.com/channel/${s.youtube_channel_id}`, icon: Youtube });
  else if (s.youtube_handle) items.push({ label: "YouTube", href: `https://youtube.com/@${s.youtube_handle}`, icon: Youtube });
  if (s.x_handle) items.push({ label: "X", href: `https://x.com/${s.x_handle}`, icon: Twitter });
  if (s.website_url) items.push({ label: "Website", href: s.website_url, icon: Globe });
  if (items.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((it) => (
        <a
          key={it.label}
          href={it.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={it.label}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/80 transition hover:border-primary hover:text-primary"
        >
          <it.icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}

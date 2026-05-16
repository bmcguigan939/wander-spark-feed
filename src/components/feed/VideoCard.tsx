import MuxPlayer from "@mux/mux-player-react";
import { Link } from "@tanstack/react-router";
import { Heart, Bookmark, MessageCircle, Share2, MapPin, Play, Tag } from "lucide-react";
import { useState } from "react";
import type { FeedVideo } from "@/lib/feed.functions";
import { useAuth } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toggleLike, toggleSave } from "@/lib/interactions.functions";
import { logDealClick } from "@/lib/deals.functions";
import { toast } from "sonner";
import { AddToCollectionSheet } from "@/components/feed/AddToCollectionSheet";

export function VideoCard({ video, active }: { video: FeedVideo; active: boolean }) {
  const [muted, setMuted] = useState(true);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();
  const likeFn = useServerFn(toggleLike);
  const saveFn = useServerFn(toggleSave);
  const logDealClickFn = useServerFn(logDealClick);

  const likeM = useMutation({
    mutationFn: () => likeFn({ data: { videoId: video.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });
  const saveM = useMutation({
    mutationFn: () => saveFn({ data: { videoId: video.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });

  function requireAuth(action: () => void) {
    if (!user) { toast("Sign in to continue", { action: { label: "Sign in", onClick: () => (window.location.href = "/login") } }); return; }
    action();
  }

  async function share() {
    const url = `${window.location.origin}/?v=${video.id}`;
    if (navigator.share) { try { await navigator.share({ title: video.title, url }); } catch {} }
    else { await navigator.clipboard.writeText(url); toast("Link copied"); }
  }

  function onDealClick() {
    if (!video.matchedDeal) return;
    // fire-and-forget attribution
    logDealClickFn({
      data: {
        dealId: video.matchedDeal.id,
        referrerVideoId: video.id,
        userId: user?.id,
      },
    }).catch(() => {});
  }

  const styleAny: any = {
    width: "100%", height: "100%",
    "--controls": "none", "--media-object-fit": "cover",
  };

  return (
    <section className="feed-snap relative h-dvh w-full overflow-hidden bg-black">
      {video.mux_playback_id ? (
        <div className="absolute inset-0" onClick={() => setMuted((m) => !m)}>
          <MuxPlayer
            streamType="on-demand"
            playbackId={video.mux_playback_id}
            autoPlay={active ? "muted" : false}
            muted={muted}
            loop
            playsInline
            style={styleAny}
            poster={video.thumbnail_url ?? undefined}
          />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card to-background">
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover opacity-60" />
          ) : (
            <Play className="h-16 w-16 text-muted-foreground" />
          )}
        </div>
      )}

      <div className="scrim-top pointer-events-none absolute inset-x-0 top-0 h-32" />
      <div className="scrim-bottom pointer-events-none absolute inset-x-0 bottom-0 h-64" />

      {/* Right rail */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 text-white">
        <Action icon={Heart} count={video.like_count} onClick={() => requireAuth(() => likeM.mutate())} />
        <Action icon={MessageCircle} count={0} onClick={() => toast("Comments coming soon")} />
        <Action icon={Bookmark} count={video.save_count} onClick={() => requireAuth(() => saveM.mutate())} />
        <Action icon={Share2} count={0} onClick={share} />
        <button onClick={() => requireAuth(() => setCollectionOpen(true))} className="text-[10px] font-semibold uppercase tracking-wide text-white/80">+Collection</button>
      </div>
      <AddToCollectionSheet open={collectionOpen} onOpenChange={setCollectionOpen} videoId={video.id} />

      {/* Bottom overlay */}
      <div className="absolute inset-x-0 bottom-4 px-4 text-white">
        <Link to="/u/$username" params={{ username: video.creator.username }} className="flex items-center gap-3">
          <img
            src={video.creator.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(video.creator.username)}`}
            alt={video.creator.username}
            className="h-10 w-10 rounded-full border-2 border-white object-cover"
          />
          <div>
            <div className="text-sm font-semibold">@{video.creator.username}</div>
            {video.creator.display_name && (
              <div className="text-xs text-white/70">{video.creator.display_name}</div>
            )}
          </div>
        </Link>

        <h2 className="mt-3 text-base font-semibold leading-snug">{video.title}</h2>

        {video.matchedDeal && (
          <Link
            to="/deals/$id"
            params={{ id: video.matchedDeal.id }}
            onClick={onDealClick}
            className="mt-3 flex items-center gap-2 rounded-2xl border border-white/20 bg-black/40 px-3 py-2 backdrop-blur-md transition hover:bg-black/55"
          >
            {video.matchedDeal.image_url ? (
              <img
                src={video.matchedDeal.image_url}
                alt=""
                className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Tag className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] uppercase tracking-wide text-white/70">
                Deal nearby
              </div>
              <div className="truncate text-sm font-semibold">
                {video.matchedDeal.title}
              </div>
            </div>
            {video.matchedDeal.discount_label && (
              <span className="flex-shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                {video.matchedDeal.discount_label}
              </span>
            )}
          </Link>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {video.country ? (
            <Link
              to={video.city ? "/destinations/$country/$city" : "/destinations/$country"}
              params={video.city ? { country: video.country, city: video.city } : { country: video.country }}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] backdrop-blur hover:bg-white/25"
            >
              <MapPin className="h-3 w-3" />
              {video.destination ?? video.city ?? video.country}{video.country && (video.destination || video.city) ? `, ${video.country}` : ""}
            </Link>
          ) : video.destination ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] backdrop-blur">
              <MapPin className="h-3 w-3" />
              {video.destination}
            </span>
          ) : null}
          {video.budget_tag && (
            <span className="rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
              {video.budget_tag}
            </span>
          )}
          {video.activity_tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] backdrop-blur">#{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Action({ icon: Icon, count, onClick }: { icon: typeof Heart; count: number; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 text-white drop-shadow-lg">
      <span className="rounded-full bg-black/30 p-2 backdrop-blur-md">
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </span>
      <span className="text-[11px] font-medium tabular-nums">{formatCount(count)}</span>
    </button>
  );
}

function formatCount(n: number) {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return (n / 1000).toFixed(1).replace(".0", "") + "K";
  return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
}

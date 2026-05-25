import MuxPlayer from "@mux/mux-player-react";
import { Link } from "@tanstack/react-router";
import { Heart, Bookmark, MessageCircle, Share2, MapPin, Play, Tag, Captions, CaptionsOff, Music, ExternalLink, Youtube, Instagram, Facebook, Twitter, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FeedVideo } from "@/lib/feed.functions";
import { useAuth } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toggleLike, toggleSave, toggleFollow } from "@/lib/interactions.functions";
import { getMyFollowing } from "@/lib/follows.functions";
import { logDealClick, logDealImpression } from "@/lib/deals.functions";
import { listVideoDeals } from "@/lib/video-deals.functions";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AddToCollectionSheet } from "@/components/feed/AddToCollectionSheet";
import { CommentsSheet } from "@/components/feed/CommentsSheet";
import { getPlatformStyle } from "@/lib/platform-style";

export function VideoCard({ video, active }: { video: FeedVideo; active: boolean }) {
  const [muted, setMuted] = useState(true);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  // Local mirror of viewer's like/save state. Seeded from the feed payload
  // and re-synced when the underlying video prop changes (e.g. tab switch
  // or refetch). This drives the optimistic +1/-1 delta so the count no
  // longer drifts upward on every tap.
  const [liked, setLiked] = useState<boolean>(!!video.viewer_liked);
  const [saved, setSaved] = useState<boolean>(!!video.viewer_saved);
  useEffect(() => { setLiked(!!video.viewer_liked); }, [video.viewer_liked]);
  useEffect(() => { setSaved(!!video.viewer_saved); }, [video.viewer_saved]);
  const playerRef = useRef<any>(null);
  const [ccAvailable, setCcAvailable] = useState(false);
  const [ccOn, setCcOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("travidz:cc") === "1";
  });
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [overlayHeight, setOverlayHeight] = useState(0);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("travidz:feedCollapsed") === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("travidz:feedCollapsed", collapsed ? "1" : "0");
  }, [collapsed]);
  useEffect(() => {
    const el = overlayRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setOverlayHeight(e.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { user } = useAuth();
  const qc = useQueryClient();
  const likeFn = useServerFn(toggleLike);
  const saveFn = useServerFn(toggleSave);
  const followFn = useServerFn(toggleFollow);
  const getMyFollowingFn = useServerFn(getMyFollowing);
  const logDealClickFn = useServerFn(logDealClick);
  const logDealImpressionFn = useServerFn(logDealImpression);
  const listVideoDealsFn = useServerFn(listVideoDeals);
  const followingQ = useQuery({
    queryKey: ["my-following"],
    queryFn: () => getMyFollowingFn(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const isFollowing = !!followingQ.data?.ids.includes(video.creator.id);
  const isSelf = user?.id === video.creator.id;
  const followM = useMutation({
    mutationFn: () => followFn({ data: { creatorId: video.creator.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-following"] });
      qc.invalidateQueries({ queryKey: ["profile", video.creator.username] });
    },
    onError: (e: any) => toast(e?.message ?? "Couldn't update follow"),
  });
  const { data: attachedDealsData } = useQuery({
    queryKey: ["video-deals", video.id],
    queryFn: () => listVideoDealsFn({ data: { videoId: video.id } }),
    staleTime: 60_000,
  });
  const attachedDeals = attachedDealsData?.deals ?? [];

  // Optimistic patch of any cached feed list (["feed", ...] and ["shared-video", ...])
  // so Like/Save updates the count instantly without refetching and reshuffling
  // the For You feed (which would jump the user off the video they're watching).
  function patchFeeds(field: "like_count" | "save_count", delta: number) {
    const caches = qc.getQueryCache().findAll();
    for (const c of caches) {
      const key = c.queryKey as unknown[];
      if (!Array.isArray(key)) continue;
      const first = key[0];
      if (first !== "feed" && first !== "shared-video") continue;
      const prev = c.state.data as { videos?: FeedVideo[] } | undefined;
      if (!prev?.videos) continue;
      qc.setQueryData(key, {
        ...prev,
        videos: prev.videos.map((x) =>
          x.id === video.id
            ? { ...x, [field]: Math.max(0, (x[field] ?? 0) + delta) }
            : x,
        ),
      });
    }
  }

  const likeM = useMutation({
    mutationFn: () => likeFn({ data: { videoId: video.id } }),
    onMutate: () => {
      const delta = liked ? -1 : 1;
      const prevLiked = liked;
      setLiked(!prevLiked);
      patchFeeds("like_count", delta);
      return {
        rollback: () => {
          setLiked(prevLiked);
          patchFeeds("like_count", -delta);
        },
      };
    },
    onError: (err, _v, ctx) => {
      ctx?.rollback?.();
      toast(err instanceof Error ? err.message : "Couldn't like — try again");
    },
  });
  const saveM = useMutation({
    mutationFn: () => saveFn({ data: { videoId: video.id } }),
    onMutate: () => {
      const delta = saved ? -1 : 1;
      const prevSaved = saved;
      setSaved(!prevSaved);
      patchFeeds("save_count", delta);
      return {
        rollback: () => {
          setSaved(prevSaved);
          patchFeeds("save_count", -delta);
        },
      };
    },
    onError: (err, _v, ctx) => {
      ctx?.rollback?.();
      toast(err instanceof Error ? err.message : "Couldn't save — try again");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });

  function requireAuth(action: () => void) {
    if (!user) { toast("Sign in to continue", { action: { label: "Sign in", onClick: () => (window.location.href = "/login") } }); return; }
    action();
  }

  async function share() {
    const url = `${window.location.origin}/?v=${video.id}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: video.title, url }); toast("Shared"); return; } catch {}
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast("Link copied");
        return;
      }
    } catch {}
    // Fallback for sandboxed iframes / insecure contexts where clipboard is blocked.
    toast("Copy this link", { description: url, duration: 8000 });
  }

  // Find the first subtitles/captions track on the underlying media element.
  function getSubsTrack(): TextTrack | null {
    const el = playerRef.current as any;
    const tracks: TextTrackList | undefined = el?.textTracks;
    if (!tracks) return null;
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      if (t.kind === "subtitles" || t.kind === "captions") return t;
    }
    return null;
  }

  function applyCcMode(on: boolean) {
    const t = getSubsTrack();
    if (!t) return;
    t.mode = on ? "showing" : "hidden";
  }

  // Detect caption tracks once they're attached and sync with preference.
  useEffect(() => {
    if (!video.mux_playback_id) return;
    const el = playerRef.current as any;
    if (!el) return;
    const check = () => {
      const t = getSubsTrack();
      if (t) {
        setCcAvailable(true);
        t.mode = ccOn ? "showing" : "hidden";
      } else {
        setCcAvailable(false);
      }
    };
    check();
    const tracks: TextTrackList | undefined = el.textTracks;
    tracks?.addEventListener?.("addtrack", check);
    tracks?.addEventListener?.("change", check);
    el.addEventListener?.("loadedmetadata", check);
    return () => {
      tracks?.removeEventListener?.("addtrack", check);
      tracks?.removeEventListener?.("change", check);
      el.removeEventListener?.("loadedmetadata", check);
    };
  }, [video.mux_playback_id, ccOn]);

  function toggleCc(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !ccOn;
    setCcOn(next);
    try { window.localStorage.setItem("travidz:cc", next ? "1" : "0"); } catch {}
    applyCcMode(next);
  }

  function onDealClick() {
    if (!video.matchedDeal) return;
    // fire-and-forget attribution
    logDealClickFn({
      data: {
        dealId: video.matchedDeal.id,
        referrerVideoId: video.id,
      },
    }).catch(() => {});
  }

  // Log a single impression per video+deal per session when the card becomes active.
  useEffect(() => {
    if (!active || !video.matchedDeal) return;
    const key = `travidz:imp:${video.id}:${video.matchedDeal.id}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {}
    logDealImpressionFn({
      data: {
        dealId: video.matchedDeal.id,
        referrerVideoId: video.id,
      },
    }).catch(() => {});
  }, [active, video.id, video.matchedDeal?.id, user?.id, logDealImpressionFn]);

  const styleAny: any = {
    width: "100%", height: "100%",
    "--controls": "none", "--media-object-fit": "cover",
  };
  const platformStyle = getPlatformStyle(video.source_platform);
  const PlatformIcon = video.source_platform === "youtube" ? Youtube
    : video.source_platform === "instagram" ? Instagram
    : video.source_platform === "facebook" ? Facebook
    : ExternalLink;
  const crossLinks = (video.cross_links ?? []).filter((l) => l?.url);

  return (
    <section className="feed-snap relative h-dvh w-full overflow-hidden bg-black">
      {video.mux_playback_id ? (
        <div className="absolute inset-0" onClick={() => setMuted((m) => !m)}>
          <MuxPlayer
            ref={playerRef}
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
        <div className={`absolute inset-0 flex items-center justify-center ${platformStyle.gradient}`}>
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover opacity-80" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center text-white">
              <PlatformIcon className="mb-5 h-12 w-12 drop-shadow" />
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Linked {platformStyle.label} video</div>
              <div className="mt-3 max-w-[18rem] font-display text-2xl font-semibold leading-tight drop-shadow">{video.title}</div>
            </div>
          )}
          <a
            href={video.source_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Open on ${platformStyle.label}`}
            className="absolute z-10 flex h-20 w-20 items-center justify-center rounded-full bg-white/15 backdrop-blur-xl ring-1 ring-white/30 transition hover:bg-white/25"
          >
            <Play className="h-9 w-9 fill-white text-white" />
          </a>
        </div>
      )}

      <div className="scrim-top pointer-events-none absolute inset-x-0 top-0 h-32" />
      <div className="scrim-bottom pointer-events-none absolute inset-x-0 bottom-0 h-80" />

      {video.source_platform && video.source_platform !== "travidz" && (
        <a
          href={video.source_url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute left-3 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-xl ring-1 ring-white/20"
        >
          <PlatformIcon className="h-3.5 w-3.5" />
          {platformStyle.label}
        </a>
      )}

      {ccAvailable && (
        <button
          onClick={toggleCc}
          aria-label={ccOn ? "Hide captions" : "Show captions"}
          className="absolute right-3 top-4 z-10 rounded-full bg-black/40 p-2 text-white backdrop-blur-md transition hover:bg-black/60"
        >
          {ccOn ? <Captions className="h-5 w-5" /> : <CaptionsOff className="h-5 w-5" />}
        </button>
      )}

      {/* Right rail — frosted circles */}
      <div
        className="absolute right-3 z-20 flex flex-col items-center gap-4 text-white transition-[bottom] duration-200"
        style={{ bottom: `calc(env(safe-area-inset-bottom) + 84px + ${overlayHeight + 16}px)` }}
      >
        <Action icon={Heart} count={video.like_count} label="Like" onClick={() => requireAuth(() => likeM.mutate())} />
        <Action icon={MessageCircle} count={video.comment_count ?? 0} label="Comments" onClick={() => setCommentsOpen(true)} />
        <Action icon={Bookmark} count={video.save_count} label="Save" onClick={() => requireAuth(() => saveM.mutate())} />
        <Action icon={Share2} label="Share" onClick={share} />
        <button
          onClick={(e) => { e.stopPropagation(); requireAuth(() => setCollectionOpen(true)); }}
          className="mt-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90 backdrop-blur-md transition hover:bg-white/20"
        >
          + Collection
        </button>
      </div>
      <AddToCollectionSheet open={collectionOpen} onOpenChange={setCollectionOpen} videoId={video.id} />
      <CommentsSheet open={commentsOpen} onOpenChange={setCommentsOpen} videoId={video.id} />

      {/* Bottom overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-20 px-4 text-white"
      >
        <div className="flex items-center gap-3">
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
          {!isSelf && !collapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                requireAuth(() => followM.mutate());
              }}
              disabled={followM.isPending}
              className={`ml-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] backdrop-blur-md transition ${
                isFollowing
                  ? "border border-white/40 bg-white/10 text-white/90"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c); }}
            aria-label={collapsed ? "Show deals and details" : "Hide deals and details"}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90 backdrop-blur-md transition hover:bg-white/20"
          >
            {collapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {collapsed ? "Show deals" : "Hide"}
          </button>
        </div>

        {!collapsed && (
          <>
        <h2 className="mt-3 font-display text-[20px] font-semibold leading-[1.15] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]">
          {video.title}
        </h2>

        {crossLinks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {crossLinks.map((l) => {
              const Icon = l.platform === "youtube" ? Youtube
                : l.platform === "instagram" ? Instagram
                : l.platform === "facebook" ? Facebook
                : l.platform === "x" ? Twitter
                : ExternalLink;
              const label = l.platform === "x" ? "X" : l.platform.charAt(0).toUpperCase() + l.platform.slice(1);
              return (
                <a
                  key={l.platform}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  <Icon className="h-3 w-3" />
                  Watch on {label}
                </a>
              );
            })}
          </div>
        )}

        {video.matchedDeal && (
          <Link
            to="/deals/$id"
            params={{ id: video.matchedDeal.id }}
            search={{ v: video.id }}
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

        {!video.matchedDeal && video.matchedBusiness && (
          <a
            href={`/api/public/b/${video.matchedBusiness.id}?v=${video.id}`}
            target="_blank"
            rel="noopener sponsored"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 flex items-center gap-2 rounded-2xl border border-white/20 bg-black/40 px-3 py-2 backdrop-blur-md transition hover:bg-black/55"
          >
            {video.matchedBusiness.logo_url ? (
              <img
                src={video.matchedBusiness.logo_url}
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
                Book direct
              </div>
              <div className="truncate text-sm font-semibold">
                {video.matchedBusiness.name}
              </div>
            </div>
            <span className="flex-shrink-0 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
              Book →
            </span>
          </a>
        )}

        {attachedDeals.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-[0.12em] text-white/70">Book this trip</div>
            {attachedDeals.slice(0, 3).map((d: any) => (
              <a
                key={d.id}
                href={`/api/public/d/${d.id}?v=${video.id}`}
                target="_blank"
                rel="noopener sponsored"
                className="flex items-center gap-2 rounded-2xl border border-white/20 bg-black/40 px-3 py-2 backdrop-blur-md transition hover:bg-black/55"
              >
                {d.image_url ? (
                  <img src={d.image_url} alt="" className="h-9 w-9 flex-shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Tag className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{d.title}</div>
                  <div className="truncate text-[11px] text-white/70">
                    {[d.city, d.country].filter(Boolean).join(", ")}
                    {d.affiliate_network ? ` · via ${d.affiliate_network}` : ""}
                  </div>
                </div>
                <span className="flex-shrink-0 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                  Book →
                </span>
              </a>
            ))}
            <div className="text-[9px] text-white/50">Sponsored · Travidz may earn a commission</div>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {video.lat != null && video.lng != null && (
            <Link
              to="/map"
              search={{ lng: video.lng, lat: video.lat, zoom: 14, layer: "both", cat: "all" }}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] backdrop-blur hover:bg-white/25"
            >
              <MapPin className="h-3 w-3" />
              Map
            </Link>
          )}
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

        {video.music && (
          <Link
            to="/sounds/$id"
            params={{ id: video.music.id }}
            className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[11px] text-white backdrop-blur hover:bg-black/60"
          >
            <Music className="h-3 w-3 flex-shrink-0 animate-pulse" />
            <span className="truncate">{video.music.title} — {video.music.artist}</span>
          </Link>
        )}
          </>
        )}
      </div>
    </section>
  );
}

function Action({
  icon: Icon,
  count,
  onClick,
  label,
}: {
  icon: typeof Heart;
  count?: number;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      aria-label={label}
      className="group flex flex-col items-center gap-1 text-white"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition group-hover:bg-white/20 group-active:scale-95">
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      </span>
      {typeof count === "number" && (
        <span className="text-[11px] font-semibold tabular-nums text-white/90 drop-shadow">{formatCount(count)}</span>
      )}
    </button>
  );
}

function formatCount(n: number) {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return (n / 1000).toFixed(1).replace(".0", "") + "K";
  return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
}

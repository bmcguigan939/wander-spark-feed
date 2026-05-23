import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/layout/BottomNav";
import { VideoCard } from "@/components/feed/VideoCard";
import { getVideosByIds } from "@/lib/feed.functions";

const searchSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  start: z.string().uuid().optional(),
});

export const Route = createFileRoute("/feed/playlist")({
  head: () => ({ meta: [{ title: "Videos here — Travidz" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: PlaylistPage,
});

function PlaylistPage() {
  const { ids, start } = Route.useSearch();
  const navigate = useNavigate();
  const fn = useServerFn(getVideosByIds);
  const { data, isLoading } = useQuery({
    queryKey: ["videos-by-ids", ids],
    queryFn: () => fn({ data: { ids } }),
    staleTime: 60_000,
  });
  const videos = data?.videos ?? [];
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Scroll to starting video once loaded
  useEffect(() => {
    if (!videos.length || !start) return;
    const idx = videos.findIndex((v) => v.id === start);
    if (idx <= 0) return;
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    if (el) el.scrollIntoView({ behavior: "auto" });
    setActiveIdx(idx);
  }, [videos, start]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveIdx(Number((visible.target as HTMLElement).dataset.idx));
      },
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll("[data-idx]").forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [videos.length]);

  const goToMap = () => {
    const active: any = videos[activeIdx];
    const withCoords = active && active.lat != null && active.lng != null
      ? active
      : (videos as any[]).find((v) => v?.lat != null && v?.lng != null);
    if (withCoords) {
      navigate({
        to: "/map",
        search: { lng: withCoords.lng, lat: withCoords.lat, zoom: 14, layer: "both", cat: "all" },
      });
    } else {
      navigate({ to: "/map", search: { lng: 0, lat: 20, zoom: 1.6, layer: "both", cat: "all" } });
    }
  };

  return (
    <MobileShell>
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex items-center justify-between px-3">
        <button
          type="button"
          onClick={goToMap}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md hover:bg-black/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Map
        </button>
        <span className="pointer-events-auto rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
          {videos.length ? `${activeIdx + 1} / ${videos.length}` : "…"}
        </span>
      </div>
      <div ref={containerRef} className="feed-scroll h-dvh overflow-y-scroll">
        {isLoading && (
          <div className="flex h-dvh items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {!isLoading && videos.length === 0 && (
          <div className="flex h-dvh items-center justify-center px-8 text-center text-sm text-muted-foreground">
            These videos are no longer available.
          </div>
        )}
        {videos.map((v, i) => (
          <div key={v.id} data-idx={i}>
            <VideoCard video={v} active={i === activeIdx} />
          </div>
        ))}
      </div>
    </MobileShell>
  );
}
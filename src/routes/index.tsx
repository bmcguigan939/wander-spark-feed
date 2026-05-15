import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { VideoCard } from "@/components/feed/VideoCard";
import { getFeed } from "@/lib/feed.functions";
import { Compass } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Travidz — Discover travel through video" }] }),
  component: FeedPage,
});

function FeedPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["feed"],
    queryFn: () => getFeed({ data: { limit: 20, offset: 0 } }),
  });
  const videos = data?.videos ?? [];
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

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

  return (
    <MobileShell>
      <div ref={containerRef} className="feed-scroll h-dvh overflow-y-scroll">
        {isLoading && <FullEmptyState title="Loading feed…" />}
        {!isLoading && videos.length === 0 && (
          <FullEmptyState
            title="Your feed is empty"
            body="Travidz is just getting started. Sign up as a creator to upload the first travel video."
          />
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

function FullEmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <section className="feed-snap flex h-dvh w-full items-center justify-center bg-gradient-to-br from-card to-background px-8 text-center">
      <div className="max-w-xs">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Compass className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
      </div>
    </section>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { VideoCard } from "@/components/feed/VideoCard";
import { getFeed, getFollowingFeed } from "@/lib/feed.functions";
import { useAuth } from "@/lib/auth";
import { Compass } from "lucide-react";
import { NotificationsBell } from "@/components/layout/NotificationsBell";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Travidz — Discover travel through video" }] }),
  component: FeedPage,
});

function FeedPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"for-you" | "following">("for-you");
  const { data, isLoading } = useQuery({
    queryKey: ["feed", tab, user?.id ?? null],
    queryFn: () =>
      tab === "following" && user
        ? getFollowingFeed({ data: { limit: 20, offset: 0 } })
        : getFeed({ data: { limit: 20, offset: 0 } }),
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
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/40 px-1 py-1 text-xs backdrop-blur-md">
          <TabBtn active={tab === "following"} onClick={() => {
            if (!user) { window.location.href = "/login"; return; }
            setTab("following");
          }}>Following</TabBtn>
          <TabBtn active={tab === "for-you"} onClick={() => setTab("for-you")}>For you</TabBtn>
        </div>
      </div>
      <div className="pointer-events-none absolute right-3 top-3 z-20">
        <NotificationsBell />
      </div>
      <div ref={containerRef} className="feed-scroll h-dvh overflow-y-scroll">
        {isLoading && <FullEmptyState title="Loading feed…" />}
        {!isLoading && videos.length === 0 && tab === "for-you" && (
          <FullEmptyState
            title="Your feed is empty"
            body="Travidz is just getting started. Sign up as a creator to upload the first travel video."
          />
        )}
        {!isLoading && videos.length === 0 && tab === "following" && (
          <FullEmptyState
            title="No videos from people you follow yet"
            body="Follow creators to see their latest travel videos here."
            action={
              <button
                onClick={() => setTab("for-you")}
                className="mt-5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                ← Back to For you
              </button>
            }
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

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 font-semibold transition ${
        active ? "bg-white text-black" : "text-white/80 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function FullEmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <section className="feed-snap flex h-dvh w-full items-center justify-center bg-gradient-to-br from-card to-background px-8 text-center">
      <div className="max-w-xs">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Compass className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
        {action}
      </div>
    </section>
  );
}

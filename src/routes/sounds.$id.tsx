import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { getMusicTrack } from "@/lib/music.functions";
import { CinematicHeader } from "@/components/ui/cinematic";
import { Music, Pause, Play, Heart, ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/sounds/$id")({
  head: ({ params }) => ({ meta: [{ title: `Sound — Travidz` }] }),
  component: SoundPage,
});

function SoundPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["music-track", id],
    queryFn: () => getMusicTrack({ data: { id } }),
  });
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const track = data?.track ?? null;
  const videos = data?.videos ?? [];

  function toggle() {
    if (!track) return;
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(track.audio_url);
      audioRef.current.volume = 0.7;
      audioRef.current.addEventListener("ended", () => setPlaying(false));
    }
    audioRef.current.play().catch(() => {});
    setPlaying(true);
  }

  if (isLoading || !track) {
    return (
      <MobileShell>
        <div className="px-5 pt-10 text-sm text-muted-foreground">
          {isLoading ? "Loading…" : "Sound not found."}
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <CinematicHeader
        height="h-56"
        image={track.cover_url ?? videos[0]?.thumbnail_url ?? null}
        eyebrow="Sound"
        title={track.title}
        subtitle={`${track.artist} · ${data?.usageCount ?? 0} video${(data?.usageCount ?? 0) === 1 ? "" : "s"}`}
        trailing={
          <button
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-aurora text-white shadow-cinematic"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
          </button>
        }
      />
      <div className="px-5 pt-5 pb-10">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>
        <Link
          to="/create"
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          <Sparkles className="h-4 w-4" /> Use this sound
        </Link>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Music className="h-4 w-4 text-primary" /> Videos using this track
        </h2>
        {videos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No videos yet. Be the first to use this sound.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {videos.map((v: any) => (
              <li key={v.id}>
                <Link to="/" search={{ v: v.id } as any} className="group block overflow-hidden rounded-2xl bg-card">
                  <div className="relative aspect-[9/14] w-full bg-muted">
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 text-white">
                      <div className="line-clamp-2 text-xs font-medium">{v.title}</div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-white/75">
                        <Heart className="h-3 w-3" /> {v.like_count}
                        {v.creator?.username && <span className="ml-1">· @{v.creator.username}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}
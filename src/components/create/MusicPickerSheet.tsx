import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { listMusicTracks, type MusicTrack } from "@/lib/music.functions";
import { Music, Pause, Play, Search, X } from "lucide-react";

export function MusicPickerSheet({
  open,
  onOpenChange,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedId: string | null;
  onSelect: (track: MusicTrack | null) => void;
}) {
  const listFn = useServerFn(listMusicTracks);
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["music-tracks", q],
    queryFn: () => listFn({ data: { q: q || undefined } }),
    enabled: open,
  });
  const tracks = data?.tracks ?? [];
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
    }
  }, [open]);

  function togglePreview(t: MusicTrack) {
    if (playingId === t.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const a = new Audio(t.audio_url);
    a.volume = 0.6;
    a.play().catch(() => {});
    a.addEventListener("ended", () => setPlayingId(null));
    audioRef.current = a;
    setPlayingId(t.id);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Music className="h-4 w-4 text-primary" /> Add music
          </SheetTitle>
        </SheetHeader>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tracks or artists"
            className="w-full rounded-full border border-border bg-card px-9 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        {selectedId && (
          <button
            onClick={() => onSelect(null)}
            className="mt-3 inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
          >
            <X className="h-3 w-3" /> Remove music
          </button>
        )}
        <ul className="mt-3 max-h-[60dvh] space-y-1.5 overflow-y-auto pb-6">
          {isLoading && <li className="px-2 py-6 text-center text-xs text-muted-foreground">Loading…</li>}
          {!isLoading && tracks.length === 0 && (
            <li className="px-2 py-6 text-center text-xs text-muted-foreground">No tracks found.</li>
          )}
          {tracks.map((t) => {
            const selected = selectedId === t.id;
            return (
              <li
                key={t.id}
                className={`flex items-center gap-3 rounded-2xl border p-2.5 transition ${
                  selected ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <button
                  onClick={() => togglePreview(t)}
                  aria-label={playingId === t.id ? "Pause" : "Play preview"}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-aurora text-white shadow-soft"
                >
                  {playingId === t.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => onSelect(t)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-sm font-semibold">{t.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.artist}</div>
                </button>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {selected ? "Selected" : "Use"}
                </span>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
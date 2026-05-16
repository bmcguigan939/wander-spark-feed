import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { searchAll } from "@/lib/feed.functions";
import { Search, X, Play } from "lucide-react";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — Travidz" },
      { name: "description", content: "Find travel videos, creators, and destinations on Travidz." },
    ],
  }),
  component: SearchPage,
});

type Tab = "videos" | "creators";

function SearchPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [tab, setTab] = useState<Tab>("videos");
  const searchFn = useServerFn(searchAll);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchFn({ data: { q: debounced } }),
    enabled: debounced.length > 0,
  });

  const videos = data?.videos ?? [];
  const creators = data?.creators ?? [];

  return (
    <MobileShell>
      <div className="px-5 pt-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search destinations, creators, tags"
            className="w-full rounded-full border border-border bg-card px-10 py-3 text-sm outline-none focus:border-primary"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {debounced && (
          <div className="mt-4 flex gap-1 rounded-full bg-card p-1">
            {(["videos", "creators"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex-1 rounded-full py-2 text-xs font-semibold capitalize ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {k} {k === "videos" ? `(${videos.length})` : `(${creators.length})`}
              </button>
            ))}
          </div>
        )}

        {!debounced && (
          <div className="mt-16 text-center text-sm text-muted-foreground">
            <Search className="mx-auto mb-3 h-10 w-10 opacity-40" />
            Find your next trip.
          </div>
        )}

        {debounced && isFetching && <p className="mt-6 text-center text-xs text-muted-foreground">Searching…</p>}

        {debounced && !isFetching && tab === "videos" && (
          videos.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">No videos match "{debounced}".</p>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-1.5">
              {videos.map((v) => (
                <Link key={v.id} to="/" className="relative aspect-[9/14] overflow-hidden rounded-md bg-card">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><Play className="h-6 w-6 text-muted-foreground" /></div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="line-clamp-2 text-[10px] font-medium text-white">{v.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {debounced && !isFetching && tab === "creators" && (
          creators.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">No creators match "{debounced}".</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {creators.map((c) => (
                <li key={c.id}>
                  <Link to="/u/$username" params={{ username: c.username }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                    <img
                      src={c.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(c.username)}`}
                      alt={c.username}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">@{c.username}</p>
                      {c.display_name && <p className="truncate text-xs text-muted-foreground">{c.display_name}</p>}
                      {c.bio && <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{c.bio}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </MobileShell>
  );
}

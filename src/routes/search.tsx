import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { MobileShell } from "@/components/layout/BottomNav";
import { searchAll, searchVideos, getSearchFacets } from "@/lib/feed.functions";
import { Search, X, Play, MapPin, Sparkles, DollarSign, ArrowDownUp, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getPlatformStyle } from "@/lib/platform-style";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  country: z.string().optional(),
  tags: fallback(z.array(z.string()), []).default([]),
  budget: z.enum(["$", "$$", "$$$"]).optional(),
  sort: fallback(z.enum(["new", "popular"]), "new").default("new"),
  view: fallback(z.enum(["videos", "creators"]), "videos").default("videos"),
});
type SearchState = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Search — Travidz" },
      { name: "description", content: "Find travel videos, creators, and destinations on Travidz." },
    ],
  }),
  component: SearchPage,
});

type SheetKind = null | "country" | "tags" | "budget" | "sort";

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [qText, setQText] = useState(search.q);
  const [debounced, setDebounced] = useState(search.q);
  const [sheet, setSheet] = useState<SheetKind>(null);

  const searchVideosFn = useServerFn(searchVideos);
  const searchAllFn = useServerFn(searchAll);
  const facetsFn = useServerFn(getSearchFacets);

  useEffect(() => { setQText(search.q); }, [search.q]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(qText.trim()), 250);
    return () => clearTimeout(t);
  }, [qText]);
  useEffect(() => {
    if (debounced !== search.q) {
      navigate({ search: (prev: SearchState) => ({ ...prev, q: debounced }), replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const hasFilters = Boolean(search.country || search.tags.length || search.budget || search.sort !== "new");
  const showVideosQuery = search.view === "videos";

  const videosQ = useQuery({
    queryKey: ["search-videos", search.q, search.country, search.tags.join(","), search.budget, search.sort],
    queryFn: () =>
      searchVideosFn({
        data: {
          q: search.q || undefined,
          country: search.country,
          tags: search.tags.length ? search.tags : undefined,
          budget: search.budget,
          sort: search.sort,
        },
      }),
    enabled: showVideosQuery,
  });

  const creatorsQ = useQuery({
    queryKey: ["search-creators", debounced],
    queryFn: () => searchAllFn({ data: { q: debounced } }),
    enabled: search.view === "creators" && debounced.length > 0,
  });

  const facetsQ = useQuery({ queryKey: ["search-facets"], queryFn: () => facetsFn({ data: undefined as any }) });

  const videos = videosQ.data?.videos ?? [];
  const creators = creatorsQ.data?.creators ?? [];

  function setSort(sort: "new" | "popular") {
    navigate({ search: (prev: SearchState) => ({ ...prev, sort }), replace: true });
    setSheet(null);
  }
  function setBudget(budget?: "$" | "$$" | "$$$") {
    navigate({ search: (prev: SearchState) => ({ ...prev, budget }), replace: true });
    setSheet(null);
  }
  function setCountry(country?: string) {
    navigate({ search: (prev: SearchState) => ({ ...prev, country }), replace: true });
    setSheet(null);
  }
  function toggleTag(tag: string) {
    navigate({
      search: (prev: SearchState) => ({
        ...prev,
        tags: prev.tags.includes(tag) ? prev.tags.filter((t: string) => t !== tag) : [...prev.tags, tag].slice(0, 8),
      }),
      replace: true,
    });
  }
  function clearAll() {
    navigate({ search: { q: search.q, view: search.view, sort: "new", tags: [] }, replace: true });
  }
  function setView(view: "videos" | "creators") {
    navigate({ search: (prev: SearchState) => ({ ...prev, view }), replace: true });
  }

  return (
    <MobileShell>
      <div className="px-5 pt-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="Search destinations, creators, tags"
            className="w-full rounded-full border border-border bg-card px-10 py-3 text-sm outline-none focus:border-primary"
          />
          {qText && (
            <button onClick={() => setQText("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip icon={MapPin} label={search.country ?? "Country"} active={!!search.country} onClick={() => setSheet("country")} onClear={search.country ? () => setCountry(undefined) : undefined} />
          <Chip icon={Sparkles} label={search.tags.length ? `Activities (${search.tags.length})` : "Activities"} active={search.tags.length > 0} onClick={() => setSheet("tags")} onClear={search.tags.length ? () => navigate({ search: (p: SearchState) => ({ ...p, tags: [] }), replace: true }) : undefined} />
          <Chip icon={DollarSign} label={search.budget ?? "Budget"} active={!!search.budget} onClick={() => setSheet("budget")} onClear={search.budget ? () => setBudget(undefined) : undefined} />
          <Chip icon={ArrowDownUp} label={search.sort === "popular" ? "Popular" : "Newest"} active={search.sort !== "new"} onClick={() => setSheet("sort")} />
          {hasFilters && (
            <button onClick={clearAll} className="flex-shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
              Clear all
            </button>
          )}
        </div>

        {/* View tabs */}
        <div className="mt-3 flex gap-1 rounded-full bg-card p-1">
          {(["videos", "creators"] as const).map((k) => (
            <button key={k} onClick={() => setView(k)}
              className={`flex-1 rounded-full py-2 text-xs font-semibold capitalize ${search.view === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {k} {k === "videos" ? `(${videos.length})` : `(${creators.length})`}
            </button>
          ))}
        </div>

        {/* Videos */}
        {search.view === "videos" && (
          videosQ.isLoading ? (
            <div className="mt-4 grid grid-cols-3 gap-1.5">
              {Array.from({ length: 9 }).map((_, i) => <div key={i} className="aspect-[9/14] animate-pulse rounded-md bg-card" />)}
            </div>
          ) : videos.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">No videos match your filters.</p>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-1.5">
              {videos.map((v) => (
                <Link key={v.id} to="/" search={{ v: v.id } as any} className="relative aspect-[9/14] overflow-hidden rounded-md bg-card">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center ${getPlatformStyle((v as any).source_platform).gradient}`}>
                      <Play className="h-6 w-6 text-white/90 drop-shadow" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="line-clamp-2 text-[10px] font-medium text-white">{v.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Creators */}
        {search.view === "creators" && (
          !debounced ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">Type to search creators.</p>
          ) : creatorsQ.isLoading ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">Searching…</p>
          ) : creators.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">No creators match "{debounced}".</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {creators.map((c) => (
                <li key={c.id}>
                  <Link to="/u/$username" params={{ username: c.username }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                    <img src={c.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(c.username)}`} alt={c.username} className="h-12 w-12 rounded-full object-cover" />
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

      {/* Filter sheets */}
      <Sheet open={sheet !== null} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader><SheetTitle>{sheet === "country" ? "Country" : sheet === "tags" ? "Activities" : sheet === "budget" ? "Budget" : "Sort"}</SheetTitle></SheetHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            {sheet === "country" && (
              <Options
                items={[{ label: "Any country", value: undefined as string | undefined }, ...(facetsQ.data?.countries.map((c) => ({ label: `${c.value} · ${c.count}`, value: c.value })) ?? [])]}
                selected={search.country}
                onPick={(v) => setCountry(v ?? undefined)}
              />
            )}
            {sheet === "tags" && (
              <div className="flex flex-wrap gap-1.5 pb-4">
                {(facetsQ.data?.tags ?? []).map((t) => {
                  const on = search.tags.includes(t.value);
                  return (
                    <button key={t.value} onClick={() => toggleTag(t.value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${on ? "bg-primary text-primary-foreground" : "bg-card text-foreground border border-border"}`}>
                      {t.value} <span className="opacity-60">· {t.count}</span>
                    </button>
                  );
                })}
                {!(facetsQ.data?.tags?.length) && <p className="text-xs text-muted-foreground">No tags yet.</p>}
              </div>
            )}
            {sheet === "budget" && (
              <Options
                items={[
                  { label: "Any budget", value: undefined },
                  { label: "$ Budget", value: "$" },
                  { label: "$$ Mid", value: "$$" },
                  { label: "$$$ Luxury", value: "$$$" },
                ]}
                selected={search.budget}
                onPick={(v) => setBudget(v as any)}
              />
            )}
            {sheet === "sort" && (
              <Options
                items={[{ label: "Newest", value: "new" as const }, { label: "Most liked", value: "popular" as const }]}
                selected={search.sort}
                onPick={(v) => setSort(v as "new" | "popular")}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </MobileShell>
  );
}

function Chip({ icon: Icon, label, active, onClick, onClear }: { icon: any; label: string; active: boolean; onClick: () => void; onClear?: () => void }) {
  return (
    <div className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card text-foreground"}`}>
      <button onClick={onClick} className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {label}
      </button>
      {onClear && (
        <button onClick={onClear} aria-label="Clear" className="opacity-70 hover:opacity-100"><X className="h-3 w-3" /></button>
      )}
    </div>
  );
}

function Options<T extends string | undefined>({ items, selected, onPick }: { items: Array<{ label: string; value: T }>; selected: T; onPick: (v: T) => void }) {
  return (
    <ul className="divide-y divide-border pb-4">
      {items.map((it) => {
        const on = selected === it.value;
        return (
          <li key={String(it.value ?? "__any")}>
            <button onClick={() => onPick(it.value)} className="flex w-full items-center justify-between py-3 text-sm">
              <span>{it.label}</span>
              {on && <Check className="h-4 w-4 text-primary" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
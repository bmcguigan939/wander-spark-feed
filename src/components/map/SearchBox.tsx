import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, X, Loader2, MapPin } from "lucide-react";
import { geocodePlace, type GeocodeResult } from "@/lib/map.functions";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPlace: (r: GeocodeResult) => void;
  onSubmitText: (q: string) => void;
  proximity?: [number, number];
};

const STORAGE_KEY = "travidz_map_recent_places";
const MAX_RECENT = 5;

function loadRecent(): GeocodeResult[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveRecent(r: GeocodeResult) {
  const list = [r, ...loadRecent().filter((x) => x.id !== r.id)].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function SearchBox({ value, onChange, onPlace, onSubmitText, proximity }: Props) {
  const geocode = useServerFn(geocodePlace);
  const [debounced, setDebounced] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [recent, setRecent] = useState<GeocodeResult[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setRecent(loadRecent()), []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 250);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    if (!debounced || debounced.startsWith("#")) {
      setResults([]);
      return;
    }
    setLoading(true);
    geocode({ data: { q: debounced, proximity } })
      .then((r) => {
        if (!cancelled) setResults(r.results);
      })
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pickPlace = (r: GeocodeResult) => {
    saveRecent(r);
    setRecent(loadRecent());
    setOpen(false);
    onPlace(r);
  };

  const showRecent = open && !value.trim() && recent.length > 0;
  const showResults = open && results.length > 0;
  const isContent = value.trim().startsWith("#");

  return (
    <div ref={wrapRef} className="pointer-events-auto relative w-full">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/90 px-3 py-2 shadow-lg backdrop-blur-xl">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (isContent) onSubmitText(value.trim().slice(1).trim());
              else if (results[0]) pickPlace(results[0]);
              else onSubmitText(value.trim());
              setOpen(false);
            }
          }}
          placeholder="Search a place, or #food, #hotels, #surf…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {value && !loading && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              onSubmitText("");
              setOpen(false);
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {(showResults || showRecent) && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-border bg-background/95 shadow-xl backdrop-blur-xl">
          {showRecent && (
            <div className="px-3 pt-3 text-[10px] uppercase tracking-wide text-muted-foreground">Recent</div>
          )}
          {showRecent &&
            recent.map((r) => (
              <button
                key={`r-${r.id}`}
                onClick={() => pickPlace(r)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{r.place_name}</span>
              </button>
            ))}
          {showResults &&
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => pickPlace(r)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span className="line-clamp-2">{r.place_name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

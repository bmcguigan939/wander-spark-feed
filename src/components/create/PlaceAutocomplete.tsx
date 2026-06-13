import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  placesAutocomplete,
  placeDetails,
  type PlaceSuggestion,
} from "@/lib/google-places.functions";

export type PlacePick = {
  destination: string;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
  formattedAddress: string;
};

function newSessionToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function PlaceAutocomplete({
  onPick,
  placeholder = "Search for a place, hotel, or address…",
}: {
  onPick: (value: PlacePick) => void;
  placeholder?: string;
}) {
  const autocomplete = useServerFn(placesAutocomplete);
  const details = useServerFn(placeDetails);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [open, setOpen] = useState(false);
  const sessionRef = useRef<string>(newSessionToken());

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await autocomplete({
          data: { input: term, sessionToken: sessionRef.current },
        });
        setResults(r.suggestions);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const pick = async (s: PlaceSuggestion) => {
    setResolving(true);
    setOpen(false);
    try {
      const d = await details({
        data: { placeId: s.placeId, sessionToken: sessionRef.current },
      });
      // Prefer the suggestion's primary text as the "destination" name
      // (e.g. "Hotel Augustine") rather than the full formatted address.
      const destination = s.primary || d.formattedAddress;
      onPick({
        destination,
        city: d.components.city,
        country: d.components.country,
        lat: d.lat,
        lng: d.lng,
        formattedAddress: d.formattedAddress,
      });
      setQ("");
      setResults([]);
      sessionRef.current = newSessionToken();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load that place");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-card pl-9 pr-9 py-2.5 text-sm outline-none focus:border-primary"
        />
        {(searching || resolving) && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg">
          {results.map((r) => (
            <li key={r.placeId}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-primary/5"
              >
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.primary || r.fullText}</div>
                  {r.secondary && (
                    <div className="truncate text-xs text-muted-foreground">{r.secondary}</div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
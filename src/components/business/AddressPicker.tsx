import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, MapPin, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  placesAutocomplete,
  placeDetails,
  geocodeAddress,
  type PlaceSuggestion,
} from "@/lib/google-places.functions";

export type AddressValue = {
  address: string;
  place_name: string;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
};

type Initial = {
  address?: string | null;
  place_name?: string | null;
  lat?: number | null;
  lng?: number | null;
};

function newSessionToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function AddressPicker({
  initial,
  onConfirmedChange,
}: {
  initial?: Initial;
  /** Fires whenever the confirmed selection (search pick or manual save) changes.
   *  Passing `null` means the user cleared it. */
  onConfirmedChange: (value: AddressValue | null) => void;
}) {
  const autocomplete = useServerFn(placesAutocomplete);
  const details = useServerFn(placeDetails);
  const geocode = useServerFn(geocodeAddress);

  const initialConfirmed: AddressValue | null = useMemo(() => {
    if (initial?.address || initial?.place_name) {
      return {
        address: initial.address ?? initial.place_name ?? "",
        place_name: initial.place_name ?? initial.address ?? "",
        city: null,
        country: null,
        lat: initial.lat ?? null,
        lng: initial.lng ?? null,
      };
    }
    return null;
  }, [initial?.address, initial?.place_name, initial?.lat, initial?.lng]);

  const [mode, setMode] = useState<"search" | "manual">("search");
  const [q, setQ] = useState(initialConfirmed?.address ?? "");
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [confirmed, setConfirmed] = useState<AddressValue | null>(initialConfirmed);
  const sessionRef = useRef<string>(newSessionToken());

  // Manual form state
  const [m, setM] = useState({
    line1: "",
    line2: "",
    city: "",
    postcode: "",
    country: "",
  });
  const [manualSaving, setManualSaving] = useState(false);

  useEffect(() => {
    if (mode !== "search") return;
    const term = q.trim();
    if (!term || term === confirmed?.address) {
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
  }, [q, mode]);

  const pick = async (s: PlaceSuggestion) => {
    setResolving(true);
    try {
      const d = await details({
        data: { placeId: s.placeId, sessionToken: sessionRef.current },
      });
      const value: AddressValue = {
        address: d.formattedAddress,
        place_name: d.formattedAddress,
        city: d.components.city,
        country: d.components.country,
        lat: d.lat,
        lng: d.lng,
      };
      setConfirmed(value);
      setQ(d.formattedAddress);
      setResults([]);
      onConfirmedChange(value);
      sessionRef.current = newSessionToken();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load that address");
    } finally {
      setResolving(false);
    }
  };

  const saveManual = async () => {
    if (!m.line1.trim() || !m.city.trim() || !m.postcode.trim() || !m.country.trim()) {
      toast.error("Please fill address, city, postcode and country.");
      return;
    }
    setManualSaving(true);
    try {
      const composed = [m.line1, m.line2, m.city, m.postcode, m.country]
        .filter((x) => x.trim())
        .join(", ");
      let lat: number | null = null;
      let lng: number | null = null;
      let formatted = composed;
      try {
        const g = await geocode({
          data: {
            line1: m.line1.trim(),
            line2: m.line2.trim() || undefined,
            city: m.city.trim(),
            postcode: m.postcode.trim(),
            country: m.country.trim(),
          },
        });
        if (g) {
          lat = g.lat;
          lng = g.lng;
          formatted = g.formattedAddress || composed;
        }
      } catch {
        /* swallow — saving without coords is allowed */
      }
      const value: AddressValue = {
        address: composed,
        place_name: formatted,
        city: m.city.trim(),
        country: m.country.trim(),
        lat,
        lng,
      };
      setConfirmed(value);
      setQ(formatted);
      setMode("search");
      onConfirmedChange(value);
      if (lat == null || lng == null) {
        toast.message("Saved — we couldn't pin this on the map yet. You can fix it later.");
      }
    } finally {
      setManualSaving(false);
    }
  };

  return (
    <div>
      {mode === "search" ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (confirmed) {
                  setConfirmed(null);
                  onConfirmedChange(null);
                }
              }}
              placeholder="Enter postcode or start typing your address…"
              className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-3 text-sm outline-none focus:border-primary"
            />
            {(searching || resolving) && (
              <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {results.length > 0 && !confirmed && (
            <ul className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
              {results.map((r) => (
                <li key={r.placeId}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-primary/5"
                    onClick={() => pick(r)}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="font-medium">{r.primary || r.fullText}</div>
                      {r.secondary && (
                        <div className="text-xs text-muted-foreground">{r.secondary}</div>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {confirmed && (
            <div className="mt-3 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{confirmed.place_name}</p>
                  {confirmed.lat != null && confirmed.lng != null ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Pin: {confirmed.lat.toFixed(4)}, {confirmed.lng.toFixed(4)}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Saved without a map pin — you can set it later in Settings.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode("manual")}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Pencil className="h-3 w-3" />
            Can't find it? Enter address manually
          </button>
        </>
      ) : (
        <div className="space-y-3 rounded-xl border border-border bg-card p-3">
          <ManualField label="Address line 1" value={m.line1} onChange={(v) => setM({ ...m, line1: v })} placeholder="Street and number" />
          <ManualField label="Address line 2 (optional)" value={m.line2} onChange={(v) => setM({ ...m, line2: v })} placeholder="Apt, unit, floor…" />
          <div className="grid grid-cols-2 gap-3">
            <ManualField label="City" value={m.city} onChange={(v) => setM({ ...m, city: v })} />
            <ManualField label="Postcode" value={m.postcode} onChange={(v) => setM({ ...m, postcode: v })} />
          </div>
          <ManualField label="Country" value={m.country} onChange={(v) => setM({ ...m, country: v })} />
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => setMode("search")}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              ← Back to search
            </button>
            <button
              type="button"
              onClick={saveManual}
              disabled={manualSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {manualSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Use this address
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, X, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { geocodePlace, saveBusinessLocation, type GeocodeResult } from "@/lib/map.functions";

export function BusinessLocationPrompt({ userId }: { userId: string }) {
  const [needsLoc, setNeedsLoc] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [picking, setPicking] = useState<GeocodeResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const geocode = useServerFn(geocodePlace);
  const saveLoc = useServerFn(saveBusinessLocation);
  const qc = useQueryClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("lat,lng")
        .eq("id", userId)
        .maybeSingle();
      setNeedsLoc(!(data?.lat && data?.lng));
    })();
    setDismissed(localStorage.getItem("travidz_biz_loc_dismissed") === "1");
  }, [userId]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await geocode({ data: { q: q.trim() } });
        setResults(r.results);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const save = async () => {
    if (!picking) return;
    setSaving(true);
    try {
      await saveLoc({
        data: {
          lat: picking.center[1],
          lng: picking.center[0],
          address: picking.place_name,
          place_name: picking.place_name,
        },
      });
      toast.success("Location saved — you'll now appear on the map.");
      setNeedsLoc(false);
      qc.invalidateQueries({ queryKey: ["map-pins"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (needsLoc !== true || dismissed) return null;

  return (
    <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Add your business location</h3>
        </div>
        <button
          onClick={() => {
            localStorage.setItem("travidz_biz_loc_dismissed", "1");
            setDismissed(true);
          }}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Travellers find you on the map when they search a destination or category. Add your address once
        and you're discoverable everywhere.
      </p>
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPicking(null);
            }}
            placeholder="Search your address or place name"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        {results.length > 0 && !picking && (
          <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-card">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setPicking(r);
                  setQ(r.place_name);
                  setResults([]);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-muted"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <span>{r.place_name}</span>
              </button>
            ))}
          </div>
        )}
        {picking && (
          <button
            disabled={saving}
            onClick={save}
            className="w-full rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : `Save: ${picking.text}`}
          </button>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { MapRef } from "react-map-gl/mapbox";
import { Loader2, LocateFixed, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { SearchBox } from "@/components/map/SearchBox";
import { reverseGeocode, type GeocodeResult } from "@/lib/map.functions";

export type DropPinResult = {
  lat: number;
  lng: number;
  place_name?: string | null;
  country?: string | null;
  city?: string | null;
  destination?: string | null;
};

type Props = {
  open: boolean;
  mapRef: React.RefObject<MapRef | null>;
  onClose: () => void;
  onConfirm: (r: DropPinResult) => void;
};

/**
 * Overlay-only pin picker. Renders on top of the existing /map Mapbox
 * canvas so we never mount a second map (which was rendering blank).
 * The "pin" is always the visual center of the screen; panning the map
 * underneath moves the selection.
 */
export function DropPinOverlay({ open, mapRef, onClose, onConfirm }: Props) {
  const reverseFn = useServerFn(reverseGeocode);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Seed center from current map view + listen for moves while open.
  useEffect(() => {
    if (!open) return;
    const m = mapRef.current?.getMap();
    if (!m) return;
    const apply = () => {
      const c = m.getCenter();
      setCenter({ lat: c.lat, lng: c.lng });
    };
    apply();
    m.on("move", apply);
    return () => {
      m.off("move", apply);
    };
  }, [open, mapRef]);

  // Reverse-geocode the current center (debounced).
  useEffect(() => {
    if (!open || !center) {
      setLabel(null);
      return;
    }
    let cancelled = false;
    setResolving(true);
    const t = setTimeout(() => {
      reverseFn({ data: { lat: center.lat, lng: center.lng } })
        .then((r) => {
          if (!cancelled) setLabel(r.place_name);
        })
        .catch(() => {
          if (!cancelled) setLabel(null);
        })
        .finally(() => !cancelled && setResolving(false));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, center?.lat, center?.lng, reverseFn]);

  if (!open) return null;

  const flyTo = (lat: number, lng: number, zoom = 14) => {
    const m = mapRef.current?.getMap();
    if (m) m.flyTo({ center: [lng, lat], zoom, duration: 800 });
  };

  const handlePlace = (r: GeocodeResult) => {
    const [lng, lat] = r.center;
    flyTo(lat, lng, 14);
    setSearchValue("");
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      toast("Geolocation not available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => flyTo(pos.coords.latitude, pos.coords.longitude, 15),
      (err) => toast(err.message),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleConfirm = async () => {
    const m = mapRef.current?.getMap();
    if (!m) return;
    const c = m.getCenter();
    setConfirming(true);
    let extra: Awaited<ReturnType<typeof reverseFn>> | null = null;
    try {
      extra = await reverseFn({ data: { lat: c.lat, lng: c.lng } });
    } catch {
      extra = null;
    }
    setConfirming(false);
    onConfirm({
      lat: c.lat,
      lng: c.lng,
      place_name: extra?.place_name ?? label ?? null,
      country: extra?.country ?? null,
      city: extra?.city ?? null,
      destination: extra?.destination ?? null,
    });
  };

  return (
    <>
      {/* Top controls — pointer-events on inner row, transparent backdrop */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex items-start gap-2 px-3"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}
      >
        <div className="pointer-events-auto min-w-0 flex-1">
          <SearchBox
            value={searchValue}
            onChange={setSearchValue}
            onPlace={handlePlace}
            onSubmitText={() => undefined}
            proximity={center ? [center.lng, center.lat] : undefined}
          />
        </div>
        <button
          type="button"
          onClick={handleMyLocation}
          aria-label="Use my location"
          className="pointer-events-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-lg backdrop-blur-xl hover:border-primary hover:text-primary"
        >
          <LocateFixed className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close pin picker"
          className="pointer-events-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-lg backdrop-blur-xl hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Centered visual pin (does not block map interaction) */}
      <div className="pointer-events-none fixed inset-0 z-[55] flex items-center justify-center">
        <div className="-translate-y-4 drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]">
          <MapPin
            className="h-10 w-10 fill-primary text-primary-foreground"
            strokeWidth={1.5}
          />
        </div>
      </div>

      {/* Bottom confirm panel — sits above the app bottom nav */}
      <div
        className="pointer-events-none fixed inset-x-0 z-[60] px-3"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 96px)" }}
      >
        <div className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur-xl">
          <div className="mb-2 flex items-start gap-2 text-xs">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              {center ? (
                <>
                  <p className="truncate font-medium text-foreground">
                    {resolving ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Finding place…
                      </span>
                    ) : (
                      label ?? "Dropped pin"
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Move the map to drop a pin</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!center || confirming}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
          >
            {confirming ? "Confirming…" : "Confirm location"}
          </button>
        </div>
      </div>
    </>
  );
}
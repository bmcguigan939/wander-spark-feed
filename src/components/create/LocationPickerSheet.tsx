import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import MapboxMap, {
  Marker,
  NavigationControl,
  type MapRef,
  type MapMouseEvent,
  type MarkerDragEvent,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2, LocateFixed, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { MAPBOX_PUBLIC_TOKEN } from "@/lib/mapbox-token";
import { SearchBox } from "@/components/map/SearchBox";
import { reverseGeocode, type GeocodeResult } from "@/lib/map.functions";

type Pin = { lat: number; lng: number };

export type LocationPickerResult = {
  lat: number;
  lng: number;
  place_name?: string | null;
  country?: string | null;
  city?: string | null;
  destination?: string | null;
};

type Props = {
  open: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  onClose: () => void;
  onConfirm: (r: LocationPickerResult) => void;
};

export function LocationPickerSheet({
  open,
  initialLat,
  initialLng,
  onClose,
  onConfirm,
}: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const reverseFn = useServerFn(reverseGeocode);

  const initialView = useMemo(() => {
    if (
      typeof initialLat === "number" &&
      typeof initialLng === "number" &&
      isFinite(initialLat) &&
      isFinite(initialLng)
    ) {
      return { latitude: initialLat, longitude: initialLng, zoom: 13 };
    }
    return { latitude: 20, longitude: 0, zoom: 1.6 };
  }, [initialLat, initialLng, open]);

  const [pin, setPin] = useState<Pin | null>(
    typeof initialLat === "number" && typeof initialLng === "number"
      ? { lat: initialLat, lng: initialLng }
      : null,
  );
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Reset state every time the sheet is reopened.
  useEffect(() => {
    if (!open) return;
    setPin(
      typeof initialLat === "number" && typeof initialLng === "number"
        ? { lat: initialLat, lng: initialLng }
        : null,
    );
    setPlaceLabel(null);
    setSearchValue("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reverse-geocode whenever the pin changes (debounced).
  useEffect(() => {
    if (!pin) {
      setPlaceLabel(null);
      return;
    }
    let cancelled = false;
    setResolving(true);
    const t = setTimeout(() => {
      reverseFn({ data: { lat: pin.lat, lng: pin.lng } })
        .then((r) => {
          if (!cancelled) setPlaceLabel(r.place_name);
        })
        .catch(() => {
          if (!cancelled) setPlaceLabel(null);
        })
        .finally(() => !cancelled && setResolving(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setResolving(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.lat, pin?.lng]);

  const handleMapClick = (e: MapMouseEvent) => {
    const { lat, lng } = e.lngLat;
    setPin({ lat, lng });
  };

  const handleMarkerDragEnd = (e: MarkerDragEvent) => {
    setPin({ lat: e.lngLat.lat, lng: e.lngLat.lng });
  };

  const flyTo = (lat: number, lng: number, zoom = 14) => {
    const m = mapRef.current?.getMap();
    if (m) m.flyTo({ center: [lng, lat], zoom, duration: 800 });
  };

  const handlePlace = (r: GeocodeResult) => {
    const [lng, lat] = r.center;
    setPin({ lat, lng });
    flyTo(lat, lng, 14);
    setSearchValue("");
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      toast("Geolocation not available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPin({ lat, lng });
        flyTo(lat, lng, 15);
      },
      (err) => toast(err.message),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleConfirm = async () => {
    if (!pin) return;
    // Best-effort enrichment for the form.
    let extra: Awaited<ReturnType<typeof reverseFn>> | null = null;
    try {
      extra = await reverseFn({ data: { lat: pin.lat, lng: pin.lng } });
    } catch {
      extra = null;
    }
    onConfirm({
      lat: pin.lat,
      lng: pin.lng,
      place_name: extra?.place_name ?? placeLabel ?? null,
      country: extra?.country ?? null,
      city: extra?.city ?? null,
      destination: extra?.destination ?? null,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex min-h-0 flex-col bg-background">
      {/* Top bar */}
      <div className="relative z-10 flex items-start gap-2 border-b border-border bg-background/95 p-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <SearchBox
            value={searchValue}
            onChange={setSearchValue}
            onPlace={handlePlace}
            onSubmitText={() => undefined}
            proximity={pin ? [pin.lng, pin.lat] : undefined}
          />
        </div>
        <button
          type="button"
          onClick={handleMyLocation}
          aria-label="Use my location"
          className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground hover:border-primary hover:text-primary"
        >
          <LocateFixed className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Map */}
      <div className="relative min-h-0 flex-1">
        <MapboxMap
          ref={mapRef}
          mapboxAccessToken={MAPBOX_PUBLIC_TOKEN}
          initialViewState={initialView}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          onClick={handleMapClick}
          onLoad={() => {
            // Force a resize after the fixed-overlay layout settles so tiles
            // paint even when the map mounted into a just-opened modal.
            requestAnimationFrame(() => mapRef.current?.getMap()?.resize());
          }}
          style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
          cursor="crosshair"
        >
          <NavigationControl position="bottom-right" showCompass={false} />
          {pin && (
            <Marker
              latitude={pin.lat}
              longitude={pin.lng}
              anchor="bottom"
              draggable
              onDragEnd={handleMarkerDragEnd}
            >
              <div className="-translate-y-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                <MapPin
                  className="h-9 w-9 fill-primary text-primary-foreground"
                  strokeWidth={1.5}
                />
              </div>
            </Marker>
          )}
        </MapboxMap>

        {/* Hint when empty */}
        {!pin && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-10 mx-auto w-fit max-w-[90%] rounded-full bg-background/90 px-4 py-1.5 text-center text-xs text-muted-foreground shadow-soft backdrop-blur">
            Tap anywhere on the map to drop a pin
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 border-t border-border bg-background/95 p-3 backdrop-blur">
        <div className="mb-2 flex items-start gap-2 text-xs">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            {pin ? (
              <>
                <p className="truncate font-medium text-foreground">
                  {resolving ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Finding place…
                    </span>
                  ) : (
                    placeLabel ?? "Dropped pin"
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No location selected</p>
            )}
          </div>
          {pin && (
            <button
              type="button"
              onClick={() => setPin(null)}
              className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!pin}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
        >
          Confirm location
        </button>
      </div>
    </div>
  );
}
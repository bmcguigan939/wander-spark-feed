import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo, useRef, useState } from "react";
import { z } from "zod";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MobileShell } from "@/components/layout/BottomNav";
import { getMapPins, type MapVideoPin, type MapDealPin } from "@/lib/map.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Video, Tag, MapPin } from "lucide-react";

// Publishable Mapbox token — safe to ship in client bundle (pk.* tokens are public).
const MAPBOX_TOKEN =
  "pk.eyJ1IjoiYm1jZ3VpZ2FuOTM5IiwiYSI6ImNtcDhhZGswdDBhNWYyc3NjdngycDAxZ28ifQ.X9A6bOGFB5bz6xljmJBwQg";

const searchSchema = z.object({
  lng: z.number().min(-180).max(180).default(0),
  lat: z.number().min(-85).max(85).default(20),
  zoom: z.number().min(0).max(22).default(1.6),
  layer: z.enum(["videos", "deals", "both"]).default("both"),
});

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Map — Travidz" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: MapPage,
});

type Selection =
  | { kind: "video"; pin: MapVideoPin }
  | { kind: "deal"; pin: MapDealPin }
  | null;

function MapPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const mapRef = useRef<MapRef | null>(null);
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selected, setSelected] = useState<Selection>(null);

  const fn = useServerFn(getMapPins);
  const { data, isLoading } = useQuery({
    queryKey: ["map-pins", search.layer],
    queryFn: () => fn({ data: { layer: search.layer } }),
    staleTime: 60_000,
  });

  const setLayer = (layer: "videos" | "deals" | "both") =>
    navigate({ to: "/map", search: (p: any) => ({ ...p, layer }), replace: true });

  const onMoveEnd = useCallback(() => {
    const m = mapRef.current?.getMap();
    if (!m) return;
    if (updateTimer.current) clearTimeout(updateTimer.current);
    updateTimer.current = setTimeout(() => {
      const c = m.getCenter();
      const z = m.getZoom();
      navigate({
        to: "/map",
        search: (p: any) => ({
          ...p,
          lng: Number(c.lng.toFixed(4)),
          lat: Number(c.lat.toFixed(4)),
          zoom: Number(z.toFixed(2)),
        }),
        replace: true,
      });
    }, 350);
  }, [navigate]);

  const videoPins = data?.videos ?? [];
  const dealPins = data?.deals ?? [];

  const totalPins = useMemo(() => videoPins.length + dealPins.length, [videoPins, dealPins]);

  return (
    <MobileShell>
      <div className="relative h-[calc(100dvh-80px)] w-full">
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{ longitude: search.lng, latitude: search.lat, zoom: search.zoom }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          onMoveEnd={onMoveEnd}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="bottom-right" showCompass={false} />

          {(search.layer === "videos" || search.layer === "both") &&
            videoPins.map((p) => (
              <Marker
                key={`v-${p.id}`}
                longitude={p.lng}
                latitude={p.lat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelected({ kind: "video", pin: p });
                }}
              >
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-lg shadow-primary/40 transition hover:scale-110"
                  aria-label={p.title}
                >
                  <Video className="h-4 w-4" />
                </button>
              </Marker>
            ))}

          {(search.layer === "deals" || search.layer === "both") &&
            dealPins.map((p) => (
              <Marker
                key={`d-${p.id}`}
                longitude={p.lng}
                latitude={p.lat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelected({ kind: "deal", pin: p });
                }}
              >
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-accent text-accent-foreground shadow-lg shadow-accent/40 transition hover:scale-110"
                  aria-label={p.title}
                >
                  <Tag className="h-4 w-4" />
                </button>
              </Marker>
            ))}
        </Map>

        {/* Top header + layer toggles */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
          <div className="pointer-events-auto flex items-center justify-between rounded-2xl border border-border bg-background/85 px-4 py-2 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h1 className="text-sm font-bold">Map</h1>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {isLoading ? "Loading…" : `${totalPins} on map`}
            </span>
          </div>
          <div className="pointer-events-auto inline-flex self-center overflow-hidden rounded-full border border-border bg-background/85 p-1 backdrop-blur-xl">
            {(["both", "videos", "deals"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLayer(l)}
                className={`px-3 py-1 text-xs font-semibold capitalize transition ${
                  search.layer === l
                    ? "rounded-full bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {totalPins === 0 && !isLoading && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center px-6">
            <div className="rounded-2xl border border-border bg-background/85 px-4 py-3 text-center text-xs text-muted-foreground backdrop-blur-xl">
              No {search.layer === "both" ? "videos or deals" : search.layer} with map coordinates yet.
            </div>
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          {selected?.kind === "video" && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{selected.pin.title}</SheetTitle>
              </SheetHeader>
              <Link
                to="/"
                search={{ v: selected.pin.id } as any}
                onClick={() => setSelected(null)}
                className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                {selected.pin.thumbnail_url ? (
                  <img
                    src={selected.pin.thumbnail_url}
                    alt=""
                    className="h-20 w-14 flex-shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-14 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                    <Video className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{selected.pin.title}</p>
                  {selected.pin.creator_username && (
                    <p className="text-[11px] text-muted-foreground">@{selected.pin.creator_username}</p>
                  )}
                  <p className="mt-1 text-xs font-medium text-primary">Watch →</p>
                </div>
              </Link>
            </>
          )}
          {selected?.kind === "deal" && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{selected.pin.title}</SheetTitle>
              </SheetHeader>
              <Link
                to="/deals/$id"
                params={{ id: selected.pin.id }}
                onClick={() => setSelected(null)}
                className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                {selected.pin.image_url ? (
                  <img
                    src={selected.pin.image_url}
                    alt=""
                    className="h-20 w-20 flex-shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                    <Tag className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{selected.pin.title}</p>
                  {selected.pin.discount_label && (
                    <span className="mt-1 inline-block rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                      {selected.pin.discount_label}
                    </span>
                  )}
                  <p className="mt-1 text-xs font-medium text-primary">View deal →</p>
                </div>
              </Link>
            </>
          )}
        </SheetContent>
      </Sheet>
    </MobileShell>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { z } from "zod";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MobileShell } from "@/components/layout/BottomNav";
import {
  getMapPins,
  type MapVideoPin,
  type MapDealPin,
  type MapBusinessPin,
  type DealCategory,
} from "@/lib/map.functions";
import { Video, Tag, Store, RefreshCcw } from "lucide-react";
import { SearchBox } from "@/components/map/SearchBox";
import { CategoryChips } from "@/components/map/CategoryChips";
import { ClusteredSheet, type ClusterIds } from "@/components/map/ClusteredSheet";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoiYm1jZ3VpZ2FuOTM5IiwiYSI6ImNtcDhhZGswdDBhNWYyc3NjdngycDAxZ28ifQ.X9A6bOGFB5bz6xljmJBwQg";

const searchSchema = z.object({
  lng: z.number().min(-180).max(180).default(0),
  lat: z.number().min(-85).max(85).default(20),
  zoom: z.number().min(0).max(22).default(1.6),
  layer: z.enum(["videos", "deals", "both"]).default("both"),
  cat: z.enum(["all", "stay", "eat", "do", "tour", "transport", "other"]).default("all"),
  q: z.string().optional(),
});
type SearchState = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Map — Find hotels, food & things to do" },
      {
        name: "description",
        content:
          "Search any destination on the Travidz map to discover affiliated hotels, restaurants, activities and creator videos near you.",
      },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: MapPage,
});

type Cluster = {
  key: string;
  lat: number;
  lng: number;
  videos: MapVideoPin[];
  deals: MapDealPin[];
  businesses: MapBusinessPin[];
};

function clusterPins(
  videos: MapVideoPin[],
  deals: MapDealPin[],
  businesses: MapBusinessPin[],
  precision: number,
): Cluster[] {
  const round = (n: number) => Math.round(n * Math.pow(10, precision)) / Math.pow(10, precision);
  const map = new Map<string, Cluster>();
  const push = (
    lat: number,
    lng: number,
    bucket: "videos" | "deals" | "businesses",
    item: any,
  ) => {
    const k = `${round(lat)}|${round(lng)}`;
    let c = map.get(k);
    if (!c) {
      c = { key: k, lat, lng, videos: [], deals: [], businesses: [] };
      map.set(k, c);
    }
    (c[bucket] as any[]).push(item);
  };
  videos.forEach((v) => push(v.lat, v.lng, "videos", v));
  deals.forEach((d) => push(d.lat, d.lng, "deals", d));
  businesses.forEach((b) => push(b.lat, b.lng, "businesses", b));
  return Array.from(map.values());
}

function MapPage() {
  const search = Route.useSearch() as SearchState;
  const navigate = useNavigate();
  const mapRef = useRef<MapRef | null>(null);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [qText, setQText] = useState(search.q ?? "");
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(null);
  const [pendingBbox, setPendingBbox] = useState<[number, number, number, number] | null>(null);
  const [selected, setSelected] = useState<{ ids: ClusterIds; title: string } | null>(null);

  const fn = useServerFn(getMapPins);
  const cat = search.cat === "all" ? undefined : (search.cat as DealCategory);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["map-pins", search.layer, cat, search.q ?? "", bbox],
    queryFn: () =>
      fn({
        data: {
          layer: search.layer,
          ...(cat ? { cat } : {}),
          ...(search.q ? { q: search.q } : {}),
          ...(bbox ? { bbox } : {}),
        },
      }),
    staleTime: 60_000,
  });

  // Initial bbox once map mounts
  const onLoad = useCallback(() => {
    const m = mapRef.current?.getMap();
    if (!m) return;
    const b = m.getBounds();
    if (!b) return;
    setBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
  }, []);

  const onMoveEnd = useCallback(() => {
    const m = mapRef.current?.getMap();
    if (!m) return;
    if (moveTimer.current) clearTimeout(moveTimer.current);
    moveTimer.current = setTimeout(() => {
      const c = m.getCenter();
      const z = m.getZoom();
      const b = m.getBounds();
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
      if (b) setPendingBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    }, 300);
  }, [navigate]);

  // Auto-refetch on first move; subsequent moves require "Search this area"
  useEffect(() => {
    if (pendingBbox && !bbox) {
      setBbox(pendingBbox);
      setPendingBbox(null);
    }
  }, [pendingBbox, bbox]);

  const flyTo = (lng: number, lat: number, zoom = 11, bb?: [number, number, number, number]) => {
    const m = mapRef.current?.getMap();
    if (!m) return;
    if (bb) {
      m.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 60, duration: 1200 });
    } else {
      m.flyTo({ center: [lng, lat], zoom, duration: 1200 });
    }
  };

  const setSearchParam = (patch: Partial<SearchState>) =>
    navigate({ to: "/map", search: (p: any) => ({ ...p, ...patch }), replace: true });

  const videoPins = data?.videos ?? [];
  const dealPins = data?.deals ?? [];
  const businessPins = data?.businesses ?? [];

  const currentZoom = search.zoom;
  // higher zoom -> finer precision (more dispersed pins)
  const precision = currentZoom > 14 ? 4 : currentZoom > 10 ? 3 : currentZoom > 6 ? 2 : 1;
  const clusters = useMemo(
    () => clusterPins(videoPins, dealPins, businessPins, precision),
    [videoPins, dealPins, businessPins, precision],
  );

  const totalPins = videoPins.length + dealPins.length + businessPins.length;

  const openCluster = (c: Cluster) => {
    const title =
      c.deals[0]?.title ??
      c.businesses[0]?.display_name ??
      c.videos[0]?.title ??
      "Pinned here";
    setSelected({
      title,
      ids: {
        deal_ids: c.deals.map((d) => d.id),
        video_ids: c.videos.map((v) => v.id),
        business_ids: c.businesses.map((b) => b.id),
      },
    });
  };

  return (
    <MobileShell>
      <div className="relative h-[calc(100dvh-80px)] w-full">
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{ longitude: search.lng, latitude: search.lat, zoom: search.zoom }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          onLoad={onLoad}
          onMoveEnd={onMoveEnd}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="bottom-right" showCompass={false} />

          {clusters.map((c) => {
            const count = c.videos.length + c.deals.length + c.businesses.length;
            const dominant: "deal" | "biz" | "video" =
              c.deals.length > 0 ? "deal" : c.businesses.length > 0 ? "biz" : "video";
            const Icon = dominant === "deal" ? Tag : dominant === "biz" ? Store : Video;
            const colorClass =
              dominant === "deal"
                ? "bg-accent text-accent-foreground shadow-accent/40"
                : dominant === "biz"
                ? "bg-secondary text-secondary-foreground shadow-secondary/40"
                : "bg-primary text-primary-foreground shadow-primary/40";
            return (
              <Marker
                key={c.key}
                longitude={c.lng}
                latitude={c.lat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  openCluster(c);
                }}
              >
                <button
                  type="button"
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-background shadow-lg transition hover:scale-110 ${colorClass}`}
                  aria-label={`${count} items here`}
                >
                  <Icon className="h-4 w-4" />
                  {count > 1 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full border border-background bg-background px-1 text-[9px] font-bold text-foreground">
                      {count}
                    </span>
                  )}
                </button>
              </Marker>
            );
          })}
        </Map>

        {/* Top: search + filters */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
          <SearchBox
            value={qText}
            onChange={setQText}
            proximity={[search.lng, search.lat]}
            onPlace={(r) => {
              setQText("");
              setSearchParam({ q: undefined });
              flyTo(r.center[0], r.center[1], 11, r.bbox);
            }}
            onSubmitText={(q) => setSearchParam({ q: q || undefined })}
          />
          <CategoryChips
            value={search.cat}
            onChange={(v) => setSearchParam({ cat: v })}
          />
          <div className="pointer-events-auto flex items-center justify-between gap-2">
            <div className="inline-flex overflow-hidden rounded-full border border-border bg-background/85 p-1 backdrop-blur-xl">
              {(["both", "videos", "deals"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setSearchParam({ layer: l })}
                  className={`px-3 py-1 text-[11px] font-semibold capitalize transition ${
                    search.layer === l
                      ? "rounded-full bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <span className="rounded-full border border-border bg-background/85 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur-xl">
              {isLoading ? "Loading…" : `${totalPins} here`}
            </span>
          </div>
        </div>

        {/* Search this area button */}
        {pendingBbox && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center px-6">
            <button
              type="button"
              onClick={() => {
                setBbox(pendingBbox);
                setPendingBbox(null);
              }}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition hover:scale-105"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Search this area
            </button>
          </div>
        )}

        {totalPins === 0 && !isLoading && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center px-6">
            <div className="rounded-2xl border border-border bg-background/85 px-4 py-3 text-center text-xs text-muted-foreground backdrop-blur-xl">
              Nothing here yet. Try another location or category.
            </div>
          </div>
        )}
      </div>

      <ClusteredSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        ids={selected?.ids ?? { deal_ids: [], video_ids: [], business_ids: [] }}
        title={selected?.title ?? ""}
      />
    </MobileShell>
  );
}

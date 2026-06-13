import { useState } from "react";
import { Layers, Check } from "lucide-react";

export type MapLayer = "default" | "satellite" | "terrain";

export const LAYER_STYLES: Record<MapLayer, string> = {
  default: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  terrain: "mapbox://styles/mapbox/outdoors-v12",
};

const OPTIONS: { value: MapLayer; label: string; hint: string }[] = [
  { value: "default", label: "Default", hint: "Real-world colours" },
  { value: "satellite", label: "Satellite", hint: "Aerial imagery" },
  { value: "terrain", label: "Terrain", hint: "Topographic" },
];

export function MapLayerSwitcher({
  value,
  onChange,
}: {
  value: MapLayer;
  onChange: (v: MapLayer) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pointer-events-auto absolute right-3 top-44 z-10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Map layers"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/95 shadow-lg backdrop-blur-xl transition hover:scale-105"
      >
        <Layers className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-border bg-background/95 shadow-xl backdrop-blur-xl">
          {OPTIONS.map((o) => {
            const active = value === o.value;
            return (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs transition ${
                  active ? "bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <span>
                  <span className="block font-semibold text-foreground">{o.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{o.hint}</span>
                </span>
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

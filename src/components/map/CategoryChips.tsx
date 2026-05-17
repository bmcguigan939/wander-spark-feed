import { Bed, UtensilsCrossed, Sparkles, Compass, Bus, LayoutGrid } from "lucide-react";
import type { DealCategory } from "@/lib/map.functions";

type Value = DealCategory | "all";
const ITEMS: { value: Value; label: string; Icon: typeof Bed }[] = [
  { value: "all", label: "All", Icon: LayoutGrid },
  { value: "stay", label: "Stay", Icon: Bed },
  { value: "eat", label: "Eat", Icon: UtensilsCrossed },
  { value: "do", label: "Do", Icon: Sparkles },
  { value: "tour", label: "Tour", Icon: Compass },
  { value: "transport", label: "Travel", Icon: Bus },
];

export function CategoryChips({
  value,
  onChange,
}: {
  value: Value;
  onChange: (v: Value) => void;
}) {
  return (
    <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ITEMS.map(({ value: v, label, Icon }) => {
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                : "border-border bg-background/85 text-foreground backdrop-blur-xl hover:bg-muted"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

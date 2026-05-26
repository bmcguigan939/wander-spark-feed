import { Star } from "lucide-react";

type Props = {
  avg: number | null | undefined;
  count: number | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function RatingSummary({ avg, count, size = "md", className }: Props) {
  const s = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const txt = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";
  if (!count || count === 0 || avg == null) {
    return (
      <span className={`inline-flex items-center gap-1 text-muted-foreground ${txt} ${className ?? ""}`}>
        <Star className={s} />
        <span>No reviews yet</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 ${txt} ${className ?? ""}`}>
      <Star className={`${s} fill-amber-400 text-amber-400`} />
      <span className="font-semibold">{Number(avg).toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({count.toLocaleString()})
      </span>
    </span>
  );
}

export function StarRow({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const s = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${s} ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}
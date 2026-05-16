import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles, X, Tag, Loader2, ExternalLink } from "lucide-react";
import { suggestDealsForVideo, attachDealsBulk } from "@/lib/video-deals.functions";
import { toast } from "sonner";

function formatPrice(cents: number | null, currency: string | null): string {
  if (!cents) return "";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency ?? ""}`;
  }
}

export function SmartDealsSheet({
  open,
  onClose,
  videoId,
}: {
  open: boolean;
  onClose: () => void;
  videoId: string | null;
}) {
  const suggestFn = useServerFn(suggestDealsForVideo);
  const attachFn = useServerFn(attachDealsBulk);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["video-deal-suggestions", videoId],
    queryFn: () => suggestFn({ data: { videoId: videoId! } }),
    enabled: open && !!videoId,
    staleTime: 60_000,
  });

  // Default-select top 3 once loaded (opt-out boosts attach rate).
  if (data?.deals && selected.size === 0 && data.deals.length > 0) {
    const defaults = new Set(data.deals.slice(0, 3).map((d) => d.id));
    if (defaults.size > 0) setSelected(defaults);
  }

  const attachM = useMutation({
    mutationFn: () =>
      attachFn({ data: { videoId: videoId!, dealIds: Array.from(selected) } }),
    onSuccess: (r) => {
      toast(`Attached ${r.count} deal${r.count === 1 ? "" : "s"}`);
      onClose();
    },
    onError: (e: any) => toast(e?.message ?? "Failed to attach"),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Smart deals for this video</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          AI found bookable activities matching your destination. Viewers can book in one tap — you earn commission on every booking.
        </p>

        {isLoading && (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Finding deals…
          </div>
        )}
        {isError && (
          <p className="mt-6 text-sm text-destructive">Couldn't load suggestions. You can skip and add deals later from your studio.</p>
        )}
        {data?.deals && data.deals.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">No matching deals found yet. Skip and we'll keep looking in the background.</p>
        )}

        <ul className="mt-4 space-y-2">
          {data?.deals.map((d) => {
            const checked = selected.has(d.id);
            return (
              <li key={d.id}>
                <label className={`flex cursor-pointer gap-3 rounded-2xl border p-3 ${checked ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = new Set(selected);
                      if (checked) next.delete(d.id); else next.add(d.id);
                      setSelected(next);
                    }}
                    className="mt-1"
                  />
                  {d.image_url ? (
                    <img src={d.image_url} alt="" className="h-14 w-14 flex-shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Tag className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-semibold">{d.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      {[d.city, d.country].filter(Boolean).join(", ") || "—"}
                      {d.affiliate_network && <span className="rounded-full bg-muted px-1.5 py-0.5">{d.affiliate_network}</span>}
                      {d.price_cents != null && <span className="font-semibold text-foreground">{formatPrice(d.price_cents, d.currency)}</span>}
                    </div>
                    <a
                      href={d.image_url ? undefined : undefined}
                      onClick={(e) => e.preventDefault()}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                    >
                      <ExternalLink className="h-3 w-3" /> Supplier link
                    </a>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="sticky bottom-0 mt-4 flex gap-2 bg-card pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold text-muted-foreground"
          >
            Skip
          </button>
          <button
            disabled={selected.size === 0 || attachM.isPending}
            onClick={() => attachM.mutate()}
            className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {attachM.isPending ? "Attaching…" : `Attach ${selected.size || ""}`.trim()}
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Travidz earns a commission when viewers book — you pay nothing extra.
        </p>
      </div>
    </div>
  );
}
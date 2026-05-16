import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Link2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  MousePointerClick,
} from "lucide-react";
import {
  createAffiliateLink,
  deleteAffiliateLink,
  listMyAffiliateLinks,
  toggleAffiliateLink,
  PROVIDER_LABELS,
  type AffiliateProvider,
} from "@/lib/affiliate.functions";

export const Route = createFileRoute("/studio/links")({
  head: () => ({ meta: [{ title: "Booking links — Travidz Studio" }] }),
  component: LinksPage,
});

const PROVIDERS: AffiliateProvider[] = [
  "booking_com",
  "getyourguide",
  "viator",
  "skyscanner",
  "airalo",
  "expedia",
  "agoda",
  "custom",
];

function LinksPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyAffiliateLinks);
  const createFn = useServerFn(createAffiliateLink);
  const toggleFn = useServerFn(toggleAffiliateLink);
  const deleteFn = useServerFn(deleteAffiliateLink);

  const { data, isLoading } = useQuery({
    queryKey: ["my-affiliate-links"],
    queryFn: () => listFn({ data: undefined as any }),
  });

  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [provider, setProvider] = useState<AffiliateProvider>("booking_com");
  const [commission, setCommission] = useState("");

  const createM = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          label,
          url,
          provider,
          commission_pct: commission ? Number(commission) : null,
        },
      }),
    onSuccess: () => {
      setLabel("");
      setUrl("");
      setCommission("");
      qc.invalidateQueries({ queryKey: ["my-affiliate-links"] });
      toast("Link added");
    },
    onError: (e: any) => toast(e?.message ?? "Couldn't add link"),
  });

  const toggleM = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) =>
      toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-affiliate-links"] }),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-affiliate-links"] });
      toast("Link removed");
    },
  });

  function trackedUrl(id: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/api/public/go/${id}`;
  }

  return (
    <div className="px-5 pb-32 pt-5">
      <header className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-aurora text-white shadow-soft">
          <Link2 className="h-4 w-4" />
        </span>
        <div>
          <div className="eyebrow">Monetise</div>
          <h2 className="font-display text-lg font-semibold leading-none">Booking links</h2>
        </div>
      </header>
      <p className="mt-2 text-xs text-muted-foreground">
        Add Booking.com, GetYourGuide, Viator or any affiliate URL. Travidz routes every
        tap through a tracked redirect so you see real click counts.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!label || !url) return;
          createM.mutate();
        }}
        className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">New tracked link</span>
        </div>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Provider
          </span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AffiliateProvider)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Label
          </span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Book the Aman Bali"
            maxLength={80}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Destination URL
          </span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            maxLength={800}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Commission % (optional)
          </span>
          <input
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            inputMode="decimal"
            placeholder="e.g. 8"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <button
          disabled={createM.isPending || !label || !url}
          className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
        >
          {createM.isPending ? "Adding…" : "Add link"}
        </button>
      </form>

      <h3 className="mt-7 font-display text-sm font-semibold">Your links</h3>
      {isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : !data?.length ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border bg-card/40 p-5 text-center text-sm text-muted-foreground">
          No links yet. Add your first booking URL above.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {data.map((l) => {
            const tracked = trackedUrl(l.id);
            return (
              <li
                key={l.id}
                className="rounded-2xl border border-border bg-card p-3 shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {PROVIDER_LABELS[l.provider]}
                      </span>
                      {!l.is_active && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Paused
                        </span>
                      )}
                      {l.commission_pct != null && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          {l.commission_pct}% commission
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold">{l.label}</div>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3 flex-shrink-0" /> {l.url}
                    </a>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1 text-[11px] font-semibold text-foreground">
                    <MousePointerClick className="h-3 w-3" />
                    {l.click_count}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tracked);
                      toast("Tracked link copied");
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background py-1.5 text-[11px] font-semibold"
                  >
                    <Copy className="h-3 w-3" /> Copy tracked
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toggleM.mutate({ id: l.id, is_active: !l.is_active })
                    }
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold"
                  >
                    {l.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {l.is_active ? "Pause" : "Resume"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && !window.confirm("Delete this link?")) return;
                      deleteM.mutate(l.id);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-[11px] font-semibold text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
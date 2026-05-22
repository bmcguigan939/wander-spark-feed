import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getAdminStats } from "@/lib/admin.functions";
import { backfillEmbeddings } from "@/lib/feed.functions";
import { backfillDestinationSummaries } from "@/lib/destinations.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const fn = useServerFn(getAdminStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fn() });
  const backfillFn = useServerFn(backfillEmbeddings);
  const [last, setLast] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: (kind: "videos" | "deals") => backfillFn({ data: { kind, limit: 25 } }),
    onSuccess: (r, kind) => setLast(`${kind}: embedded ${r.ok}/${r.attempted}`),
    onError: (e: any) => setLast(`error: ${e?.message ?? e}`),
  });
  const summariesFn = useServerFn(backfillDestinationSummaries);
  const [sumLast, setSumLast] = useState<string | null>(null);
  const ms = useMutation({
    mutationFn: () => summariesFn({ data: { limit: 5, minVideos: 3, staleDays: 30 } }),
    onSuccess: (r) => setSumLast(`generated ${r.ok}/${r.attempted}`),
    onError: (e: any) => setSumLast(`error: ${e?.message ?? e}`),
  });

  return (
    <div className="px-4 py-6 pb-28">
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {data && (
        <>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Users" value={data.users} to="/admin/users" />
          <Stat label="Creators" value={data.creators} to="/admin/users" />
          <Stat label="Businesses" value={data.businesses} to="/admin/users" />
          <Stat label="Verified biz" value={(data as any).verifiedBusinesses ?? 0} to="/admin/users" />
          <Stat label="Videos live" value={data.videosReady} to="/admin/videos" />
          <Stat label="Pending videos" value={data.videosPending} accent to="/admin/videos" />
          <Stat label="Hidden videos" value={data.videosHidden} to="/admin/videos" />
          <Stat label="Active deals" value={data.dealsActive} to="/admin/deals" />
          <Stat label="Pending apps" value={data.appsPending} accent to="/admin/deals" />
          <Stat label="Mod flags" value={(data as any).pendingModerationFlags ?? 0} accent to="/admin/moderation" />
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Marketplace (last 30d)</p>
          <div className="grid grid-cols-2 gap-3">
            <Money label="GMV 30d" cents={(data as any).gmv30dCents ?? 0} />
            <Money label="Commission 30d" cents={(data as any).commission30dCents ?? 0} />
            <Money label="Outstanding payouts" cents={(data as any).outstandingLiabilityCents ?? 0} accent />
            <Stat label="Bookings 7d / 30d" value={(data as any).redemptions7d ?? 0} suffix={` / ${(data as any).redemptions30d ?? 0}`} />
            <Money label="Travidz share 30d" cents={(data as any).platformShare30dCents ?? 0} accent />
            <Pct label="Blended take-rate" value={(data as any).blendedTakeRate30d ?? 0} accent />
            <Stat label="Founding creators" value={(data as any).foundingCreators ?? 0} />
            <Stat label="Power creators" value={(data as any).powerCreators ?? 0} />
          </div>
        </div>
        </>
      )}
      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold">Semantic search backfill</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Generate embeddings for items missing them (25 at a time).
        </p>
        <div className="mt-3 flex gap-2">
          <button
            disabled={m.isPending}
            onClick={() => m.mutate("videos")}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            Embed videos
          </button>
          <button
            disabled={m.isPending}
            onClick={() => m.mutate("deals")}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            Embed deals
          </button>
        </div>
        {last && <p className="mt-2 text-xs text-muted-foreground">{last}</p>}
      </div>
      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold">Destination summaries</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Generate AI overviews for popular (city, country) pairs with 3+ videos and no recent summary.
        </p>
        <button
          disabled={ms.isPending}
          onClick={() => ms.mutate()}
          className="mt-3 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {ms.isPending ? "Generating…" : "Generate 5 summaries"}
        </button>
        {sumLast && <p className="mt-2 text-xs text-muted-foreground">{sumLast}</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, accent, suffix, to }: { label: string; value: number; accent?: boolean; suffix?: string; to?: "/admin/users" | "/admin/videos" | "/admin/deals" | "/admin/moderation" }) {
  const base = `block rounded-2xl border p-4 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"} ${to ? "transition hover:border-primary/60 hover:shadow-sm active:scale-[0.99]" : ""}`;
  const body = (
    <>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${accent ? "text-primary" : ""}`}>{value}{suffix ?? ""}</div>
    </>
  );
  if (to) return <Link to={to} className={base}>{body}</Link>;
  return <div className={base}>{body}</div>;
}

function Money({ label, cents, accent }: { label: string; cents: number; accent?: boolean }) {
  const fmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(cents / 100);
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${accent ? "text-primary" : ""}`}>{fmt}</div>
    </div>
  );
}

function Pct({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  const fmt = `${(value * 100).toFixed(2)}%`;
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${accent ? "text-primary" : ""}`}>{fmt}</div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const fn = useServerFn(getAdminStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fn() });

  return (
    <div className="px-4 py-6 pb-28">
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {data && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Users" value={data.users} />
          <Stat label="Creators" value={data.creators} />
          <Stat label="Businesses" value={data.businesses} />
          <Stat label="Videos live" value={data.videosReady} />
          <Stat label="Pending videos" value={data.videosPending} accent />
          <Stat label="Hidden videos" value={data.videosHidden} />
          <Stat label="Active deals" value={data.dealsActive} />
          <Stat label="Pending apps" value={data.appsPending} accent />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

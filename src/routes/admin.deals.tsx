import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAdminDeals, setDealActive, deleteDealAdmin } from "@/lib/admin.functions";
import { Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/deals")({
  component: AdminDeals,
});

const FILTERS = ["all", "active", "inactive"] as const;

function AdminDeals() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminDeals);
  const setActiveFn = useServerFn(setDealActive);
  const delFn = useServerFn(deleteDealAdmin);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-deals", filter, q],
    queryFn: () => listFn({ data: { filter, q: q || undefined } }),
  });

  const setActive = useMutation({
    mutationFn: (v: { dealId: string; active: boolean }) => setActiveFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-deals"] }),
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });
  const del = useMutation({
    mutationFn: (dealId: string) => delFn({ data: { dealId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-deals"] }); toast("Deleted"); },
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });

  return (
    <div className="px-4 py-4 pb-28 space-y-3">
      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            }`}>{f}</button>
        ))}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title…"
        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && data?.deals.length === 0 && <p className="text-sm text-muted-foreground">No deals.</p>}
      <ul className="space-y-2">
        {data?.deals.map((d: any) => (
          <li key={d.id} className="flex gap-3 rounded-2xl border border-border bg-card p-2">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {d.image_url && <img src={d.image_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <div className="line-clamp-2 text-sm font-medium flex-1">{d.title}</div>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${d.is_active ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                  {d.is_active ? "ON" : "OFF"}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {d.business?.username ? `@${d.business.username} · ` : ""}{[d.city, d.country].filter(Boolean).join(", ") || d.destination || "—"} · {d.click_count} clicks
              </div>
              <div className="mt-2 flex gap-1.5">
                <button onClick={() => setActive.mutate({ dealId: d.id, active: !d.is_active })}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold">
                  {d.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {d.is_active ? "Pause" : "Activate"}
                </button>
                <button onClick={() => { if (confirm("Delete deal permanently?")) del.mutate(d.id); }}
                  className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

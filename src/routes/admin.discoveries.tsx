import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listPendingDiscoveries,
  approveDiscovery,
  rejectDiscovery,
  runDiscoveryManual,
} from "@/lib/discovery.functions";
import { Check, X, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/discoveries")({
  component: AdminDiscoveries,
});

function formatPrice(cents: number | null, currency: string | null) {
  if (!cents) return "";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency ?? ""}`;
  }
}

function AdminDiscoveries() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPendingDiscoveries);
  const approveFn = useServerFn(approveDiscovery);
  const rejectFn = useServerFn(rejectDiscovery);
  const runFn = useServerFn(runDiscoveryManual);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-discoveries"],
    queryFn: () => listFn({ data: undefined as any }),
  });

  const approve = useMutation({
    mutationFn: (id: string) => approveFn({ data: { dealId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-discoveries"] }),
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });
  const reject = useMutation({
    mutationFn: (id: string) => rejectFn({ data: { dealId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-discoveries"] }),
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });
  const run = useMutation({
    mutationFn: () => runFn({ data: undefined as any }),
    onSuccess: (r: any) => {
      toast(`Discovery run: ${r?.inserted ?? 0} new candidates`);
      qc.invalidateQueries({ queryKey: ["admin-discoveries"] });
    },
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-3 px-4 py-4 pb-28">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">AI deal moderation queue</h2>
        <button
          onClick={() => run.mutate()}
          disabled={run.isPending}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {run.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Run discovery
        </button>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && data?.deals.length === 0 && <p className="text-sm text-muted-foreground">Nothing pending review.</p>}
      <ul className="space-y-2">
        {data?.deals.map((d) => (
          <li key={d.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-sm font-semibold">{d.title}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {[d.city, d.country].filter(Boolean).join(", ") || d.destination || "—"}
                  {d.affiliate_network ? ` · ${d.affiliate_network}` : ""}
                  {d.price_cents != null ? ` · ${formatPrice(d.price_cents, d.currency)}` : ""}
                </div>
              </div>
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                {Math.round((d.ai_confidence ?? 0) * 100)}%
              </span>
            </div>
            {d.ai_summary && <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">{d.ai_summary}</p>}
            <div className="mt-2 flex items-center gap-1.5">
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
              >
                <ExternalLink className="h-3 w-3" /> Open
              </a>
              <button
                onClick={() => approve.mutate(d.id)}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-600"
              >
                <Check className="h-3 w-3" /> Approve
              </button>
              <button
                onClick={() => reject.mutate(d.id)}
                className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-semibold text-destructive"
              >
                <X className="h-3 w-3" /> Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
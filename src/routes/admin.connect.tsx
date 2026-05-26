import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ExternalLink, Building2 } from "lucide-react";
import {
  adminListConnectAccounts,
  adminRefreshConnectAccount,
  adminConnectDashboardLink,
} from "@/lib/admin-connect.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/admin/connect")({
  head: () => ({ meta: [{ title: "Connect accounts — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminConnect,
});

function money(cents: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase() }).format((cents ?? 0) / 100);
}

function StatusBadge({ s }: { s: string }) {
  const cls: Record<string, string> = {
    none: "bg-muted text-muted-foreground",
    pending: "bg-amber-500/15 text-amber-600",
    active: "bg-emerald-500/15 text-emerald-600",
    restricted: "bg-orange-500/15 text-orange-600",
    rejected: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${cls[s] ?? "bg-muted"}`}>
      {s}
    </span>
  );
}

function AdminConnect() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListConnectAccounts);
  const refreshFn = useServerFn(adminRefreshConnectAccount);
  const dashFn = useServerFn(adminConnectDashboardLink);
  const env = getStripeEnvironment();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-connect"],
    queryFn: () => listFn(),
  });

  const refresh = useMutation({
    mutationFn: (id: string) => refreshFn({ data: { profile_id: id, environment: env } }),
    onSuccess: (r: any) => {
      if (r?.ok === false) return toast.error(r.error ?? "Failed");
      toast.success("Status refreshed");
      qc.invalidateQueries({ queryKey: ["admin-connect"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const openDash = useMutation({
    mutationFn: (id: string) => dashFn({ data: { profile_id: id, environment: env } }),
    onSuccess: (r: any) => {
      if (r?.url) window.open(r.url, "_blank", "noopener");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const accounts = (data?.accounts ?? []) as any[];

  return (
    <div className="px-4 py-6 pb-28">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Connect accounts</h2>
        <span className="ml-auto text-xs text-muted-foreground">{accounts.length} businesses</span>
      </div>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && accounts.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          No business accounts yet.
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {accounts.map((a) => (
          <li key={a.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{a.display_name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {a.account_type} · {a.country ?? "—"} · {a.currency?.toUpperCase() ?? "—"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                  <StatusBadge s={a.status} />
                  {a.charges_enabled && <span className="text-emerald-600">charges ✓</span>}
                  {a.payouts_enabled && <span className="text-emerald-600">payouts ✓</span>}
                  {a.currently_due_count > 0 && (
                    <span className="text-amber-600">{a.currently_due_count} due</span>
                  )}
                  {a.disabled_reason && (
                    <span className="text-destructive">{a.disabled_reason}</span>
                  )}
                  {a.payout_method === "manual_bank" && !a.connect_account_id && (
                    <span className="text-muted-foreground italic">legacy manual bank</span>
                  )}
                </div>
                {a.last_payout && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last payout: {money(a.last_payout.amount_cents, a.last_payout.currency)} ·{" "}
                    {a.last_payout.status}
                    {a.last_payout.arrival_date && ` · arrives ${new Date(a.last_payout.arrival_date).toLocaleDateString()}`}
                  </p>
                )}
                {a.connect_account_id && (
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">{a.connect_account_id}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!a.connect_account_id || refresh.isPending}
                  onClick={() => refresh.mutate(a.id)}
                >
                  {refresh.isPending && refresh.variables === a.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!a.connect_account_id || openDash.isPending}
                  onClick={() => openDash.mutate(a.id)}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
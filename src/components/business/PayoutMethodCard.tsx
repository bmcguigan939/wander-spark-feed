import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Banknote, CheckCircle2, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getStripeEnvironment } from "@/lib/stripe";
import {
  getMyConnectStatus,
  startConnectOnboarding,
  createConnectDashboardLink,
} from "@/lib/stripe-connect.functions";

export function PayoutMethodCard({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getMyConnectStatus);
  const startFn = useServerFn(startConnectOnboarding);
  const dashFn = useServerFn(createConnectDashboardLink);

  const { data, isLoading } = useQuery({
    queryKey: ["connect-status"],
    queryFn: () => getFn(),
  });

  const startMut = useMutation({
    mutationFn: () =>
      startFn({ data: { environment: getStripeEnvironment(), country: "GB", returnPath: "/business/onboarding/payout" } }),
    onSuccess: (r: any) => {
      if (r?.url) window.location.href = r.url;
      else toast.error("Could not start Stripe onboarding");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to start onboarding"),
  });

  const dashMut = useMutation({
    mutationFn: () => dashFn({ data: { environment: getStripeEnvironment() } }),
    onSuccess: (r: any) => {
      if (r?.url) window.open(r.url, "_blank", "noopener");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not open Stripe"),
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
        <Loader2 className="inline h-4 w-4 animate-spin" /> Loading payout method…
      </div>
    );
  }

  const status = data?.stripe_connect_status ?? "none";
  const payoutsReady = !!data?.stripe_connect_payouts_enabled;
  const chargesReady = !!data?.stripe_connect_charges_enabled;

  if (status === "none" || !data?.stripe_connect_account_id) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Connect your bank with Stripe</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Travidz uses Stripe to pay you automatically. When a customer books,
              Stripe routes your share straight to your bank — we keep our 11% fee.
              You'll verify your business and bank in 2–3 minutes on Stripe.
            </p>
            <button
              onClick={() => startMut.mutate()}
              disabled={startMut.isPending}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 disabled:opacity-60"
            >
              {startMut.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening Stripe…</>
              ) : (
                <><Banknote className="h-3.5 w-3.5" /> Connect bank with Stripe</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!payoutsReady) {
    const reqs = (data?.stripe_connect_requirements as any) ?? {};
    const due: string[] = [
      ...(reqs.currently_due ?? []),
      ...(reqs.past_due ?? []),
    ];
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Finish Stripe verification</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Stripe still needs a few details before we can release payouts to your bank.
              {chargesReady ? " Charges are enabled but payouts are paused." : ""}
            </p>
            {due.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-[11px] text-muted-foreground">
                {due.slice(0, 4).map((d) => <li key={d}>{d.replace(/_/g, " ")}</li>)}
              </ul>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => startMut.mutate()}
                disabled={startMut.isPending}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 disabled:opacity-60"
              >
                {startMut.isPending ? "Opening…" : "Continue on Stripe"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Stripe payouts active</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data?.stripe_connect_country ?? "—"} · {(data?.stripe_connect_default_currency ?? "gbp").toUpperCase()}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Bookings pay out automatically to your bank on Stripe's schedule.
          </p>
          {!compact && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => dashMut.mutate()}
                disabled={dashMut.isPending}
                className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-semibold"
              >
                {dashMut.isPending ? "Opening…" : (<>Manage on Stripe <ExternalLink className="h-3 w-3" /></>)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
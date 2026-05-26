import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { ArrowLeft, Banknote, ShieldCheck } from "lucide-react";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth";
import { PayoutMethodCard } from "@/components/business/PayoutMethodCard";
import { refreshConnectStatus } from "@/lib/stripe-connect.functions";
import { listMyDeals } from "@/lib/deals.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/business/onboarding/payout")({
  head: () => ({ meta: [{ title: "Payouts — Travidz" }] }),
  validateSearch: (s: Record<string, unknown>): { connect?: string } => ({
    connect: typeof s.connect === "string" ? s.connect : undefined,
  }),
  component: PayoutSetupPage,
});

function PayoutSetupPage() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const refreshFn = useServerFn(refreshConnectStatus);
  const dealsFn = useServerFn(listMyDeals);
  const { connect } = useSearch({ from: "/business/onboarding/payout" });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  // When returning from Stripe-hosted onboarding, re-pull status.
  useEffect(() => {
    if (!user || !isBusiness || !connect) return;
    (async () => {
      try {
        const status = await refreshFn({ data: { environment: getStripeEnvironment() } });
        qc.invalidateQueries({ queryKey: ["connect-status"] });
        qc.invalidateQueries({ queryKey: ["bookable-status"] });
        if ((status as any)?.stripe_connect_payouts_enabled) {
          // Auto-route to next step: a draft to publish, or the new-listing flow.
          try {
            const { deals } = await dealsFn();
            const draft = (deals ?? []).find((d: any) => d.status === "draft");
            if (draft) {
              navigate({ to: "/business/deals/$id/edit", params: { id: draft.id } });
              return;
            }
          } catch { /* ignore */ }
          navigate({ to: "/business" });
        }
      } catch {
        /* ignore — user can retry from the card */
      }
    })();
  }, [connect, user, isBusiness, refreshFn, qc, dealsFn, navigate]);

  if (!user || !isBusiness) return null;

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-24">
        <Link to="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Payouts</h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Travidz collects payment from customers and Stripe automatically routes
          your share straight to your bank — we keep our 11% fee. No invoicing,
          no manual transfers.
        </p>

        <div className="mt-5">
          <PayoutMethodCard />
        </div>

        <div className="mt-6 space-y-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/30 p-3">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <p>
              Bank details are stored by Stripe, not Travidz. Verification (KYC),
              tax forms, and payout schedule are managed inside your Stripe Express
              dashboard.
            </p>
          </div>
          <p>
            Supported countries include the UK, EU, US, Canada, Australia and New
            Zealand. If your country isn't supported by Stripe Connect, contact
            support and we'll arrange manual payouts.
          </p>
        </div>
      </div>
    </MobileShell>
  );
}
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { DealForm } from "@/components/business/DealForm";
import { useAccountKind } from "@/lib/useAccountKind";
import { createDeal } from "@/lib/deals.functions";
import { getMyConnectStatus } from "@/lib/stripe-connect.functions";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Banknote, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/business/deals/new")({
  head: () => ({ meta: [{ title: "New Deal — Travidz" }] }),
  component: NewDealPage,
});

function NewDealPage() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const createFn = useServerFn(createDeal);
  const payoutFn = useServerFn(getMyConnectStatus);
  const [busy, setBusy] = useState(false);
  const accountKind = useAccountKind();
  const [policy, setPolicy] = useState<
    "travidz_standard" | "free_cancel_until_start" | "non_refundable" | "custom_24h" | "custom_7d"
  >("travidz_standard");

  const { data: payout } = useQuery({
    queryKey: ["connect-status"],
    queryFn: () => payoutFn(),
    enabled: !!user && isBusiness,
  });
  const hasPayout = !!(payout as any)?.stripe_connect_payouts_enabled;

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  if (!user || !isBusiness) return null;

  return (
    <MobileShell>
      <div className="px-4 pt-4">
        <Link to="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="mt-3 mb-1 text-xl font-semibold">New listing</h1>
        <p className="mb-4 text-xs text-muted-foreground">
          Customers always book and pay through Travidz. We keep 11% and Stripe pays the
          rest straight to your bank.
        </p>
        {!hasPayout && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900 dark:text-amber-300">
                Your bank isn't connected yet
              </p>
              <p className="mt-0.5 text-amber-900/90 dark:text-amber-200/90">
                No problem — this listing will save as a draft so you don't lose your
                work. Connect your bank to publish it.
              </p>
              <Link
                to="/business/onboarding/payout"
                className="mt-1.5 inline-flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-300"
              >
                <Banknote className="h-3 w-3" /> Connect bank
              </Link>
            </div>
          </div>
        )}
        <div className="mb-4 rounded-2xl border border-border/60 bg-card/40 p-3">
          <label htmlFor="policy" className="text-xs font-medium text-muted-foreground">
            Cancellation policy
          </label>
          <select
            id="policy"
            value={policy}
            onChange={(e) => setPolicy(e.target.value as any)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm"
          >
            <option value="travidz_standard">Travidz standard (recommended)</option>
            <option value="free_cancel_until_start">Free cancellation until travel date</option>
            <option value="custom_24h">Free cancellation up to 24h before</option>
            <option value="custom_7d">Free cancellation up to 7 days before</option>
            <option value="non_refundable">Non-refundable</option>
          </select>
        </div>
        <DealForm
          submitLabel={hasPayout ? "Publish listing" : "Save as draft"}
          busy={busy}
          accountKind={accountKind}
          onSubmit={async (values) => {
            setBusy(true);
            try {
              const cleaned = Object.fromEntries(
                Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
              ) as any;
              cleaned.cancellation_policy_code = policy;
              const { id, status } = await createFn({ data: cleaned });
              if (status === "draft") {
                toast.success("Saved as draft — connect your bank to publish");
              } else {
                toast.success("Listing published");
              }
              navigate({ to: "/business/deals/$id/edit", params: { id } });
            } catch (e: any) {
              toast.error(e?.message ?? "Failed");
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </MobileShell>
  );
}
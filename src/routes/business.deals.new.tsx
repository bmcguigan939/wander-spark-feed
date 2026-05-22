import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { DealForm } from "@/components/business/DealForm";
import { createDeal } from "@/lib/deals.functions";
import { getMyPayoutMethod } from "@/lib/payout.functions";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Banknote, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/business/deals/new")({
  head: () => ({ meta: [{ title: "New Deal — Travidz" }] }),
  component: NewDealPage,
});

function NewDealPage() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const createFn = useServerFn(createDeal);
  const payoutFn = useServerFn(getMyPayoutMethod);
  const [busy, setBusy] = useState(false);
  const [bookable, setBookable] = useState(false);
  const [policy, setPolicy] = useState<
    "travidz_standard" | "free_cancel_until_start" | "non_refundable" | "custom_24h" | "custom_7d"
  >("travidz_standard");

  const { data: payout } = useQuery({
    queryKey: ["payout-method"],
    queryFn: () => payoutFn(),
    enabled: !!user && isBusiness,
  });
  const hasPayout = payout?.payout_method === "manual_bank";

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
        <h1 className="mt-3 mb-4 text-xl font-semibold">New deal</h1>
        <div className="mb-4 rounded-2xl border border-border/60 bg-card/40 p-3">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={bookable}
              onChange={(e) => setBookable(e.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>
              <span className="font-semibold">Book through Travidz</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Customers pay Travidz at checkout. We take 8% and pay you weekly.
                Leave off for traditional affiliate-link deals.
              </span>
            </span>
          </label>
          {bookable && !hasPayout && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <div className="flex-1">
                <p>Add a payout method before listing a bookable deal.</p>
                <Link
                  to="/business/onboarding/payout"
                  className="mt-1.5 inline-flex items-center gap-1 font-semibold text-amber-500"
                >
                  <Banknote className="h-3 w-3" /> Set up payouts
                </Link>
              </div>
            </div>
          )}
          {bookable && (
            <div className="mt-3">
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
          )}
        </div>
        <DealForm
          submitLabel="Create deal"
          busy={busy}
          onSubmit={async (values) => {
            if (bookable && !hasPayout) {
              toast.error("Add a payout method first");
              return;
            }
            setBusy(true);
            try {
              const cleaned = Object.fromEntries(
                Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
              ) as any;
              cleaned.bookable = bookable;
              if (bookable) cleaned.cancellation_policy_code = policy;
              const { id } = await createFn({ data: cleaned });
              toast.success("Deal created");
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
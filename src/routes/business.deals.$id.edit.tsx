import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { DealForm } from "@/components/business/DealForm";
import { getDeal, updateDeal, deleteDeal } from "@/lib/deals.functions";
import { getMyConnectStatus } from "@/lib/stripe-connect.functions";
import { DealCalendarSync } from "@/components/business/DealCalendarSync";
import { RoomsAndRatesEditor } from "@/components/business/RoomsAndRatesEditor";
import { CompetitorUrlsEditor } from "@/components/business/CompetitorUrlsEditor";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Banknote, Check, Info, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type PolicyCode =
  | "travidz_standard"
  | "free_cancel_until_start"
  | "non_refundable"
  | "custom_24h"
  | "custom_7d";

export const Route = createFileRoute("/business/deals/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Listing — Travidz" }] }),
  component: EditDealPage,
});

function EditDealPage() {
  const { id } = Route.useParams();
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const fetchFn = useServerFn(getDeal);
  const updateFn = useServerFn(updateDeal);
  const deleteFn = useServerFn(deleteDeal);
  const payoutFn = useServerFn(getMyConnectStatus);
  const [busy, setBusy] = useState(false);
  const [policy, setPolicy] = useState<PolicyCode>("travidz_standard");
  const [policyHydrated, setPolicyHydrated] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["deal", id],
    queryFn: () => fetchFn({ data: { id } }),
    enabled: !!user && isBusiness,
    retry: false,
  });
  const deal = data?.deal as any;

  const { data: payout } = useQuery({
    queryKey: ["connect-status"],
    queryFn: () => payoutFn(),
    enabled: !!user && isBusiness,
  });
  const hasPayout = !!(payout as any)?.stripe_connect_payouts_enabled;

  // Hydrate policy from the loaded deal once.
  useEffect(() => {
    if (!deal || policyHydrated) return;
    if (deal.cancellation_policy_code) {
      setPolicy(deal.cancellation_policy_code as PolicyCode);
    }
    setPolicyHydrated(true);
  }, [deal, policyHydrated]);

  if (!user || !isBusiness) return null;

  const isDraft = deal?.status === "draft";
  const heading = isDraft ? "New listing" : "Edit listing";

  const savePolicy = async (next: PolicyCode) => {
    setPolicy(next);
    try {
      await updateFn({ data: { id, patch: { cancellation_policy_code: next } } });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save cancellation policy");
    }
  };

  const publishNow = async () => {
    if (!deal) return;
    if (!deal.title || deal.title === "Untitled listing") {
      toast.error("Add a title before publishing");
      return;
    }
    setBusy(true);
    try {
      await updateFn({
        data: { id, patch: { status: "approved", is_active: true } },
      });
      toast.success("Listing published");
      navigate({ to: "/business" });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't publish");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobileShell>
      <div className="px-4 pt-4">
        <Link to="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="mt-3 mb-1 text-xl font-semibold">{heading}</h1>
        {isDraft && (
          <p className="mb-4 text-xs text-muted-foreground">
            Customers always book and pay through Travidz. We keep 11% and Stripe pays
            the rest straight to your bank.
          </p>
        )}
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {deal && (
          <>
            {isDraft && !hasPayout && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-300">
                    Your bank isn't connected yet
                  </p>
                  <p className="mt-0.5 text-amber-900/90 dark:text-amber-200/90">
                    No problem — this listing will save as a draft so you don't lose
                    your work. Connect your bank to publish it.
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

            {/* 1. Basics */}
            <section id="basics" className="scroll-mt-20">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Basics
              </h2>
              <div className="mb-3 rounded-2xl border border-border/60 bg-card/40 p-3">
                <label htmlFor="policy" className="text-xs font-medium text-muted-foreground">
                  Cancellation policy
                </label>
                <select
                  id="policy"
                  value={policy}
                  onChange={(e) => void savePolicy(e.target.value as PolicyCode)}
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
                initial={deal}
                submitLabel="Save changes"
                busy={busy}
                autoSaveOnBlur={isDraft}
                onSubmit={async (values) => {
                  setBusy(true);
                  try {
                    const cleaned = Object.fromEntries(
                      Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
                    ) as any;
                    await updateFn({ data: { id, patch: cleaned } });
                    if (!isDraft) toast.success("Saved");
                  } catch (e: any) {
                    toast.error(e?.message ?? "Failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </section>

            {/* 2. Rooms & options */}
            <section id="rooms" className="mt-6 scroll-mt-20">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Rooms &amp; rates
              </h2>
              <RoomsAndRatesEditor dealId={id} category={deal.category} />
            </section>

            {/* 3. Calendar feeds */}
            <section id="calendar" className="mt-6 scroll-mt-20">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Calendar feeds
              </h2>
              <DealCalendarSync dealId={id} />
            </section>

            {/* 4. Where else is this listed */}
            <section id="otas" className="mt-6 scroll-mt-20">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Where else is this listed?
              </h2>
              <p className="mb-3 text-xs text-muted-foreground">
                Pin your listing URL on every OTA you're on. Our price-match
                scanner uses these to compare like-for-like and protect your
                rate parity. If you're only on Travidz, you can skip this.
              </p>
              <CompetitorUrlsEditor />
            </section>

            {/* Bottom CTA */}
            {isDraft && hasPayout && (
              <button
                type="button"
                onClick={publishNow}
                disabled={busy}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-aurora px-4 py-3 text-sm font-semibold text-white shadow-soft disabled:opacity-60"
              >
                <Check className="h-4 w-4" /> {busy ? "Publishing…" : "Publish listing"}
              </button>
            )}
            {isDraft && !hasPayout && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    toast.success("Saved as draft");
                    navigate({ to: "/business" });
                  }}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30"
                >
                  Save as draft
                </button>
                <Link
                  to="/business/onboarding/payout"
                  className="mt-2 inline-flex w-full items-center justify-center gap-1 text-xs font-semibold text-primary"
                >
                  <Banknote className="h-3 w-3" /> Connect bank to publish
                </Link>
              </>
            )}
            {!isDraft && (
              <button
                type="button"
                onClick={() => {
                  toast.success("Saved");
                  navigate({ to: "/business" });
                }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-aurora px-4 py-3 text-sm font-semibold text-white shadow-soft"
              >
                <Check className="h-4 w-4" /> Done — back to dashboard
              </button>
            )}
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              You can edit this listing any time from your dashboard.
            </p>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 px-4 py-3 text-sm font-semibold text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Delete listing
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the listing and its public link. Click history stays in analytics but the listing won't show on the public deals page anymore.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      try {
                        await deleteFn({ data: { id } });
                        toast.success("Deleted");
                        navigate({ to: "/business" });
                      } catch (e: any) {
                        toast.error(e?.message ?? "Failed");
                      }
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </MobileShell>
  );
}
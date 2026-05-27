import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { DealForm } from "@/components/business/DealForm";
import { getDeal, updateDeal, deleteDeal } from "@/lib/deals.functions";
import { DealCalendarSync } from "@/components/business/DealCalendarSync";
import { RoomsAndRatesEditor } from "@/components/business/RoomsAndRatesEditor";
import { CompetitorUrlsEditor } from "@/components/business/CompetitorUrlsEditor";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
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

export const Route = createFileRoute("/business/deals/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Deal — Travidz" }] }),
  component: EditDealPage,
});

function EditDealPage() {
  const { id } = Route.useParams();
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const fetchFn = useServerFn(getDeal);
  const updateFn = useServerFn(updateDeal);
  const deleteFn = useServerFn(deleteDeal);
  const [busy, setBusy] = useState(false);

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

  if (!user || !isBusiness) return null;

  return (
    <MobileShell>
      <div className="px-4 pt-4">
        <Link to="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="mt-3 mb-4 text-xl font-semibold">Edit deal</h1>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {deal && (
          <>
            <DealForm
              initial={deal}
              submitLabel="Save changes"
              busy={busy}
              onSubmit={async (values) => {
                setBusy(true);
                try {
                  const cleaned = Object.fromEntries(
                    Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
                  ) as any;
                  await updateFn({ data: { id, patch: cleaned } });
                  toast.success("Saved");
                } catch (e: any) {
                  toast.error(e?.message ?? "Failed");
                } finally {
                  setBusy(false);
                }
              }}
            />
            <DealCalendarSync dealId={id} />
            <RoomsAndRatesEditor dealId={id} category={deal.category} />
            <details className="mt-6 rounded-2xl border border-border/60 bg-card/40 p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Where else is this listed? <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                Pin your Booking.com / Expedia / GetYourGuide etc. listing URLs so
                our price-match scanner compares the exact same room or ticket.
                These apply to every listing under your business.
              </p>
              <div className="mt-3">
                <CompetitorUrlsEditor />
              </div>
            </details>
            <button
              type="button"
              onClick={() => {
                toast.success("Deal set up complete");
                navigate({ to: "/business" });
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-aurora px-4 py-3 text-sm font-semibold text-white shadow-soft"
            >
              <Check className="h-4 w-4" /> Done — back to dashboard
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              You can edit this deal any time from your dashboard.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 px-4 py-3 text-sm font-semibold text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Delete deal
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the deal and its public link. Click history stays in analytics but the deal won't show on the public deals page anymore.
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
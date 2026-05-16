import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { DealForm } from "@/components/business/DealForm";
import { getDeal, updateDeal, deleteDeal } from "@/lib/deals.functions";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
            <button
              onClick={async () => {
                if (!confirm("Delete this deal?")) return;
                try {
                  await deleteFn({ data: { id } });
                  toast.success("Deleted");
                  navigate({ to: "/business" });
                } catch (e: any) {
                  toast.error(e?.message ?? "Failed");
                }
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 px-4 py-3 text-sm font-semibold text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Delete deal
            </button>
          </>
        )}
      </div>
    </MobileShell>
  );
}
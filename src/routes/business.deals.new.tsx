import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { DealForm } from "@/components/business/DealForm";
import { createDeal } from "@/lib/deals.functions";
import { useAuth } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/business/deals/new")({
  head: () => ({ meta: [{ title: "New Deal — Travidz" }] }),
  component: NewDealPage,
});

function NewDealPage() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const createFn = useServerFn(createDeal);
  const [busy, setBusy] = useState(false);

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
        <DealForm
          submitLabel="Create deal"
          busy={busy}
          onSubmit={async (values) => {
            setBusy(true);
            try {
              const cleaned = Object.fromEntries(
                Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
              ) as any;
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
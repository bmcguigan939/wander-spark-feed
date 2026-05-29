import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAccountKind } from "@/lib/useAccountKind";
import { createDeal } from "@/lib/deals.functions";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/business/deals/new")({
  head: () => ({ meta: [{ title: "New Listing — Travidz" }] }),
  component: NewDealPage,
});

function NewDealPage() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const createFn = useServerFn(createDeal);
  const accountKind = useAccountKind();
  const started = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!isBusiness) {
      navigate({ to: "/business/apply" });
      return;
    }
    if (started.current) return;
    started.current = true;

    const category =
      accountKind === "activity" ? "do" : accountKind === "stay" ? "stay" : "other";

    (async () => {
      try {
        const { id } = await createFn({
          data: {
            title: "Untitled listing",
            is_active: false,
            status: "draft",
            cancellation_policy_code: "travidz_standard",
            category,
          },
        });
        navigate({
          to: "/business/deals/$id/edit",
          params: { id },
          replace: true,
        });
      } catch (e: any) {
        started.current = false;
        toast.error(e?.message ?? "Couldn't start a new listing");
        navigate({ to: "/business", replace: true });
      }
    })();
  }, [loading, user, isBusiness, accountKind, createFn, navigate]);

  return (
    <MobileShell>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Preparing your listing…</p>
      </div>
    </MobileShell>
  );
}
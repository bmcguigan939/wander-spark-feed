import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { applyForBusiness } from "@/lib/deals.functions";
import { useAuth } from "@/lib/auth";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/business/apply")({
  head: () => ({ meta: [{ title: "Become a Business — Travidz" }] }),
  component: BusinessApply,
});

function BusinessApply() {
  const { user, loading, isBusiness, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const applyFn = useServerFn(applyForBusiness);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (isBusiness) navigate({ to: "/business" });
  }, [loading, user, isBusiness, navigate]);

  const onApply = async () => {
    try {
      await applyFn();
      await refreshRoles();
      toast.success("You're now a business account");
      navigate({ to: "/business" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to apply");
    }
  };

  if (!user) return null;

  return (
    <MobileShell>
      <div className="px-6 pt-16 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Briefcase className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold">List travel deals</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          Promote tours, stays, and experiences directly inside Travidz. Track clicks and pair deals with destinations.
        </p>
        <button
          onClick={onApply}
          className="mt-8 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30"
        >
          Activate business account
        </button>
      </div>
    </MobileShell>
  );
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { BusinessPhotosEditor } from "@/components/business/BusinessPhotosEditor";
import { useAuth } from "@/lib/auth";
import { useAccountKind } from "@/lib/useAccountKind";
import { ArrowLeft, Check } from "lucide-react";

export const Route = createFileRoute("/business/photos")({
  head: () => ({ meta: [{ title: "Property Photos — Travidz" }] }),
  component: BusinessPhotosPage,
});

function BusinessPhotosPage() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const accountKind = useAccountKind();
  const isActivity = accountKind === "activity";
  const photosKind: "stay" | "activity" = isActivity ? "activity" : "stay";

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
        <h1 className="mt-3 mb-1 text-xl font-semibold">
          {isActivity ? "Activity photos" : "Property photos"}
        </h1>
        <p className="mb-4 text-xs text-muted-foreground">
          Add at least 3 photos showing your {isActivity ? "activity or meeting location" : "property"} so
          travellers can preview before booking. Tap the star to choose your cover photo.
        </p>

        <BusinessPhotosEditor businessId={user.id} kind={photosKind} />

        <button
          type="button"
          onClick={() => navigate({ to: "/business" })}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-aurora px-4 py-3 text-sm font-semibold text-white shadow-soft"
        >
          <Check className="h-4 w-4" /> Done — back to dashboard
        </button>
      </div>
    </MobileShell>
  );
}
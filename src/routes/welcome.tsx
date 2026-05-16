import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Compass, Camera, Briefcase, Plane } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome — Travidz" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: WelcomePage,
});

function WelcomePage() {
  const navigate = useNavigate();
  const { user, roles, refreshRoles } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  // If user already has a non-default role, skip.
  if (roles.some((r) => r === "creator" || r === "business" || r === "admin")) {
    navigate({ to: "/" });
    return null;
  }

  function markDone() {
    try { localStorage.setItem("travidz:welcomed", "1"); } catch {}
  }

  async function pickTraveller() {
    setBusy("traveller");
    markDone();
    navigate({ to: "/" });
  }

  async function pickCreator() {
    if (!user) return;
    setBusy("creator");
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "creator" });
    if (error && !/duplicate/i.test(error.message)) {
      setBusy(null);
      toast.error(error.message);
      return;
    }
    await refreshRoles();
    markDone();
    toast.success("You're a creator now");
    navigate({ to: "/create" });
  }

  async function pickBusiness() {
    setBusy("business");
    markDone();
    navigate({ to: "/business/apply" });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Compass className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Travidz</h1>
        <p className="mt-2 text-sm text-muted-foreground">How will you use Travidz? You can change this later.</p>
      </div>

      <div className="space-y-3">
        <RoleCard
          icon={<Plane className="h-5 w-5" />}
          title="Traveller"
          desc="Discover destinations, save videos, follow creators."
          onClick={pickTraveller}
          busy={busy === "traveller"}
        />
        <RoleCard
          icon={<Camera className="h-5 w-5" />}
          title="Creator"
          desc="Share travel videos with the community."
          onClick={pickCreator}
          busy={busy === "creator"}
          highlight
        />
        <RoleCard
          icon={<Briefcase className="h-5 w-5" />}
          title="Business"
          desc="Promote hotels, tours and deals."
          onClick={pickBusiness}
          busy={busy === "business"}
        />
      </div>

      <button
        onClick={pickTraveller}
        className="mt-6 text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Skip for now
      </button>
    </div>
  );
}

function RoleCard({
  icon, title, desc, onClick, busy, highlight,
}: {
  icon: React.ReactNode; title: string; desc: string;
  onClick: () => void; busy: boolean; highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition disabled:opacity-50 ${
        highlight
          ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
          : "border-border bg-card hover:bg-muted/40"
      }`}
    >
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
        highlight ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
      }`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}
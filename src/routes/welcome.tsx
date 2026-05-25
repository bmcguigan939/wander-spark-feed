import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Compass, Camera, Briefcase, Plane, Crown } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getFoundingSpotsRemaining,
  sendFoundingWelcomeIfEligible,
} from "@/lib/creator-tier.functions";

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
  const spotsFn = useServerFn(getFoundingSpotsRemaining);
  const { data: spots } = useQuery({
    queryKey: ["founding-spots-remaining"],
    queryFn: () => spotsFn(),
  });
  const sendFoundingFn = useServerFn(sendFoundingWelcomeIfEligible);

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
    // Trigger founding-creator welcome email if eligible (first 500).
    sendFoundingFn().then((r) => {
      if (r?.sent) toast.success(`Founding Creator #${r.foundingNumber} — 50% for life`);
      else toast.success("You're a creator now");
    }).catch(() => toast.success("You're a creator now"));
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

      {spots && spots.remaining > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
          <Crown className="h-4 w-4 text-primary" />
          <span>
            <span className="font-bold text-primary">{spots.remaining}</span> Founding Creator
            spots left — join now and keep <span className="font-semibold">50% commission for 24 months</span>.
          </span>
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-border bg-card/40 p-4 text-xs leading-relaxed">
        <p className="mb-2 text-sm font-semibold text-foreground">Creator earnings — how the split works</p>
        <ul className="space-y-1.5 text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">Founding Creator</span> (first 5,000):
            keep 50% for the first 24 months.
          </li>
          <li>
            <span className="font-semibold text-foreground">Power Creator</span>: keep 50% for life
            as long as you post <span className="font-semibold text-foreground">≥ 1 video / month</span>
            and drive <span className="font-semibold text-foreground">≥ £25k</span> in rolling
            12-month bookings. 60-day grace if you slip.
          </li>
          <li>
            <span className="font-semibold text-foreground">Standard ladder</span>: 50% (months 1–6)
            → 40% (7–18) → 30% (19+).
          </li>
        </ul>
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
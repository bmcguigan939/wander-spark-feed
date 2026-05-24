import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/hooks/useSubscription";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { createPortalSession } from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Travidz Creator Pro & Business Plus" },
      { name: "description", content: "Unlock lower commission, featured placement, advanced analytics and Founding Member perks. Plans from £19/mo." },
    ],
  }),
  component: PricingPage,
});

type Cycle = "monthly" | "yearly";

const PLANS = [
  {
    id: "creator_pro",
    name: "Creator Pro",
    tagline: "For travel creators ready to grow",
    monthly: { priceId: "creator_pro_monthly", amount: 19 },
    yearly: { priceId: "creator_pro_yearly", amount: 190 },
    perks: [
      "5% commission (down from 8%)",
      "Advanced creator analytics",
      "Priority deal approval",
      "Pro badge on your profile",
      "Early access to new features",
    ],
  },
  {
    id: "business_plus",
    name: "Business Plus",
    tagline: "For businesses scaling on Travidz",
    monthly: { priceId: "business_plus_monthly", amount: 49 },
    yearly: { priceId: "business_plus_yearly", amount: 490 },
    perks: [
      "Featured deal placement",
      "Advanced booking analytics",
      "Priority customer support",
      "Verified+ business badge",
      "AI deal optimization suggestions",
    ],
    highlight: true,
  },
] as const;

function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sub, isActive, plan } = useSubscription();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const { openCheckout, checkoutElement, closeCheckout, isOpen } = useStripeCheckout();
  const portalFn = useServerFn(createPortalSession);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleSubscribe = (priceId: string) => {
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/pricing" } as never });
      return;
    }
    openCheckout({
      priceId,
      customerEmail: user.email,
      userId: user.id,
      returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const url = await portalFn({
        data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/pricing` },
      });
      window.open(url, "_blank");
    } catch (e) {
      toast.error("Couldn't open billing portal", { description: (e as Error).message });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center">
          <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground">← Travidz</Link>
          <h1 className="mt-6 text-4xl font-bold sm:text-5xl">Earn more from every trip.</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Upgrade your account, unlock lower commission and featured placement, and lock in Founding Member pricing forever.
          </p>

          {isActive && (
            <div className="mx-auto mt-6 inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm">
              <span>You're on <strong className="capitalize">{plan?.replace("_", " ")}</strong></span>
              {sub?.is_founding_member && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                  Founding Member #{sub.founding_member_number}
                </span>
              )}
              <button onClick={handlePortal} disabled={portalLoading} className="underline">
                {portalLoading ? "Opening…" : "Manage"}
              </button>
            </div>
          )}

          <div className="mt-8 inline-flex rounded-full border border-border bg-card p-1">
            <button
              onClick={() => setCycle("monthly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${cycle === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >Monthly</button>
            <button
              onClick={() => setCycle("yearly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${cycle === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >Yearly · <span className="text-emerald-400">save 17%</span></button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {PLANS.map((p) => {
            const price = cycle === "monthly" ? p.monthly : p.yearly;
            const isCurrent = isActive && plan === p.id;
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border p-8 ${p.highlight ? "border-primary/50 bg-gradient-to-b from-primary/10 to-transparent" : "border-border bg-card"}`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Most popular</span>
                )}
                <h2 className="text-xl font-semibold">{p.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">£{price.amount}</span>
                  <span className="text-sm text-muted-foreground">/{cycle === "monthly" ? "mo" : "yr"}</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex gap-2"><span className="text-primary">✓</span>{perk}</li>
                  ))}
                </ul>
                <button
                  disabled={isCurrent}
                  onClick={() => handleSubscribe(price.priceId)}
                  className={`mt-8 w-full rounded-full py-3 text-sm font-semibold transition ${
                    isCurrent
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : p.highlight
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "bg-foreground text-background hover:opacity-90"
                  }`}
                >
                  {isCurrent ? "Current plan" : isActive ? "Switch to this plan" : "Get started"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Cancel anytime — you keep access until the end of your billing period. The first 100 subscribers become Founding Members.
        </p>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeCheckout}>
          <div className="w-full max-w-xl rounded-2xl bg-background p-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeCheckout} className="mb-2 text-sm text-muted-foreground hover:text-foreground">✕ Close</button>
            {checkoutElement}
          </div>
        </div>
      )}
    </div>
  );
}
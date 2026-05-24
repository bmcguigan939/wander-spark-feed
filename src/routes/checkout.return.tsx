import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const { user } = useAuth();
  const { sub, isActive, refetch } = useSubscription();
  const [tick, setTick] = useState(0);

  // Poll briefly while webhook lands the row
  useEffect(() => {
    if (isActive || tick > 10) return;
    const t = setTimeout(() => { void refetch(); setTick((n) => n + 1); }, 1000);
    return () => clearTimeout(t);
  }, [isActive, tick, refetch]);

  if (!session_id) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-muted-foreground">No checkout session found.</p>
      </div>
    );
  }

  const firstName = user?.user_metadata?.full_name?.split(" ")[0]
    ?? user?.email?.split("@")[0]
    ?? "there";

  return (
    <div className="min-h-dvh bg-gradient-to-b from-primary/10 via-background to-background">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 text-6xl animate-bounce">🎉</div>
        <h1 className="text-3xl font-bold sm:text-4xl">Welcome aboard, {firstName}.</h1>

        {!isActive ? (
          <p className="mt-4 text-muted-foreground">Finalizing your subscription… this takes a few seconds.</p>
        ) : (
          <>
            {sub?.is_founding_member && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-5 py-2.5">
                <span className="text-2xl">👑</span>
                <div className="text-left">
                  <div className="text-xs uppercase tracking-widest text-amber-300">Founding Member</div>
                  <div className="text-sm font-semibold">You're number {sub.founding_member_number} of 100</div>
                </div>
              </div>
            )}
            <p className="mt-6 max-w-md text-muted-foreground">
              {sub?.is_founding_member
                ? "You're locked into today's pricing forever — even when we raise it. Your badge is now live on your profile, and you'll be first in line for every new feature we ship."
                : "Your perks are live. Lower commission, the Pro badge, and priority support are all switched on right now."}
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link to="/profile" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
                See your new badge
              </Link>
              <Link to="/pricing" className="rounded-full border border-border px-6 py-3 text-sm font-semibold">
                Manage plan
              </Link>
            </div>
          </>
        )}

        <p className="mt-12 text-xs text-muted-foreground">Receipt sent to {user?.email}</p>
      </div>
    </div>
  );
}
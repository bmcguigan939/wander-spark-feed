import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Check, Circle, Sparkles } from "lucide-react";
import { useState } from "react";
import { getMyAgreementStatus } from "@/lib/verification.functions";
import { listMyDeals } from "@/lib/deals.functions";
import { listBusinessRedemptions } from "@/lib/redemptions.functions";
import { getMyPayoutMethod } from "@/lib/payout.functions";

type Step = {
  id: string;
  title: string;
  desc: string;
  done: boolean;
  to: string;
};

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(false);
  const agreementFn = useServerFn(getMyAgreementStatus);
  const dealsFn = useServerFn(listMyDeals);
  const redemptionsFn = useServerFn(listBusinessRedemptions);
  const payoutFn = useServerFn(getMyPayoutMethod);

  const { data: agreement } = useQuery({
    queryKey: ["agreement-status"],
    queryFn: () => agreementFn(),
  });
  const { data: dealsRes } = useQuery({
    queryKey: ["my-deals"],
    queryFn: () => dealsFn(),
  });
  const { data: redemptionsRes } = useQuery({
    queryKey: ["business-redemptions"],
    queryFn: () =>
      redemptionsFn({ data: { limit: 50, offset: 0 } as any }).catch(
        () => ({ redemptions: [] as any[] }) as any,
      ),
  });
  const { data: payout } = useQuery({
    queryKey: ["payout-method"],
    queryFn: () => payoutFn(),
  });

  const deals = (dealsRes?.deals ?? []) as any[];
  const redemptions = ((redemptionsRes as any)?.redemptions ?? []) as any[];

  const steps: Step[] = [
    {
      id: "agreement",
      title: "Accept business agreement",
      desc: "Confirms you've reviewed the latest terms.",
      done: !!agreement?.business_accepted,
      to: "/legal/business-agreement",
    },
    {
      id: "first-deal",
      title: "Publish your first deal",
      desc: "Add an offer so creators can promote it.",
      done: deals.some((d) => d.is_active),
      to: "/business/deals/new",
    },
    {
      id: "payout",
      title: "Set up payouts",
      desc: "Add a bank account so Travidz can pay you for bookings.",
      done: payout?.payout_method === "manual_bank",
      to: "/business/onboarding/payout",
    },
    {
      id: "first-redemption",
      title: "Confirm a booking",
      desc: "Approve a creator-led booking to start the commission flow.",
      done: redemptions.some((r) => r.status === "confirmed"),
      to: "/business/redemptions",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;

  if (allDone || dismissed) return null;

  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div className="mb-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-card/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Getting started</h2>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Hide
        </button>
      </div>
      <div className="mt-2 mb-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {completed} of {steps.length} complete
        </p>
      </div>
      <ul className="space-y-1.5">
        {steps.map((s) => (
          <li key={s.id}>
            <Link
              to={s.to}
              className={`flex items-start gap-2.5 rounded-xl px-2 py-1.5 text-sm transition ${
                s.done ? "opacity-60" : "hover:bg-primary/5"
              }`}
            >
              {s.done ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1">
                <div
                  className={`text-xs font-semibold ${s.done ? "line-through" : ""}`}
                >
                  {s.title}
                </div>
                <div className="text-[11px] text-muted-foreground">{s.desc}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
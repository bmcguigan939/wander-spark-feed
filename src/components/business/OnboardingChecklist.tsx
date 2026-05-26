import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Check, Circle, Sparkles } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { getMyAgreementStatus } from "@/lib/verification.functions";
import { getBookableStatus, GATE_LABELS, gateLinkFor, type BookableGate, type AccountKind } from "@/lib/bookable.functions";
import { COMMISSION } from "@/lib/commission";
import { getMyCollabDefaults } from "@/lib/collabs.functions";
import { listMyDeals } from "@/lib/deals.functions";

type Step = {
  id: string;
  title: string;
  desc: string;
  done: boolean;
  to: string;
};

function gateCopy(
  gate: BookableGate,
  kind: AccountKind,
): { title: string; desc: string } {
  const isActivity = kind === "activity";
  switch (gate) {
    case "photos":
      return isActivity
        ? {
            title: "Add photos of your activity",
            desc: "At least 3 photos of your activity or meeting location.",
          }
        : {
            title: GATE_LABELS.photos,
            desc: "At least 3 photos of your property.",
          };
    case "items":
      return isActivity
        ? {
            title: "Add your activity packages",
            desc: "Add each package you sell (half-day, full-day, private, etc.), with a photo.",
          }
        : {
            title: GATE_LABELS.items,
            desc: "Add rooms or activity options, each with a photo.",
          };
    case "rates":
      return isActivity
        ? {
            title: "Price each package",
            desc: "Price each package and pick a cancellation policy.",
          }
        : {
            title: GATE_LABELS.rates,
            desc: "Price each room/option with a cancellation policy.",
          };
    case "calendar":
      return isActivity
        ? {
            title: "Connect availability",
            desc: "Connect an iCal feed or add native time-slots so we never overbook you.",
          }
        : {
            title: GATE_LABELS.calendar,
            desc: "Connect an iCal feed (Booking.com, Airbnb, Lodgify) to prevent double-bookings.",
          };
    case "payouts":
      return {
        title: GATE_LABELS.payouts,
        desc: "Add a bank account so we can pay you for confirmed bookings.",
      };
  }
}

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(false);
  const { user } = useAuth();
  const agreementFn = useServerFn(getMyAgreementStatus);
  const bookableFn = useServerFn(getBookableStatus);
  const defaultsFn = useServerFn(getMyCollabDefaults);
  const dealsFn = useServerFn(listMyDeals);

  const { data: agreement } = useQuery({
    queryKey: ["agreement-status"],
    queryFn: () => agreementFn(),
  });
  const { data: bookable } = useQuery({
    queryKey: ["bookable-status", user?.id],
    queryFn: () => bookableFn({ data: { businessId: user!.id } }),
    enabled: !!user?.id,
  });
  const { data: collabDefaults } = useQuery({
    queryKey: ["collab-defaults"],
    queryFn: () => defaultsFn(),
    enabled: !!user?.id,
  });
  const { data: myDeals } = useQuery({
    queryKey: ["my-deals"],
    queryFn: () => dealsFn(),
    enabled: !!user?.id,
  });
  const firstDealId: string | null = (myDeals?.deals ?? [])[0]?.id ?? null;

  const ALL_GATES: BookableGate[] = ["photos", "items", "rates", "calendar", "payouts"];
  const missing = new Set(bookable?.missing ?? ALL_GATES);
  const accountKind: AccountKind = bookable?.accountKind ?? "unknown";

  const steps: Step[] = [
    {
      id: "agreement",
      title: "Accept business agreement",
      desc: `Confirms our ${COMMISSION.totalPct}% commission terms.`,
      done: !!agreement?.business_accepted,
      to: "/legal/business-agreement",
    },
    ...ALL_GATES.map<Step>((gate) => {
      const copy = gateCopy(gate, accountKind);
      return {
        id: gate,
        title: copy.title,
        desc: copy.desc,
        done: !missing.has(gate),
        to: gateLinkFor(gate, firstDealId),
      };
    }),
    {
      id: "collab-defaults",
      title: "Set your collab defaults",
      desc: "30s with recommended settings — every creator you accept inherits these terms.",
      done: !!collabDefaults?.defaults,
      to: "/business/collabs",
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
          <h2 className="text-sm font-semibold">
            {bookable?.bookable ? "You're bookable on Travidz" : "Enable bookings on Travidz"}
          </h2>
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
          {completed} of {steps.length} complete · Travidz takes {COMMISSION.totalPct}% on confirmed bookings only
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
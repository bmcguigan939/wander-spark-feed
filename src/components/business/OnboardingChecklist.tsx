import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Check, Circle, Sparkles, AlertTriangle, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { getMyAgreementStatus } from "@/lib/verification.functions";
import { getBookableStatus, GATE_LABELS, gateLinkFor, type BookableGate, type AccountKind } from "@/lib/bookable.functions";
import { COMMISSION } from "@/lib/commission";
import { getMyCollabRules } from "@/lib/collabs.functions";
import { listMyDeals } from "@/lib/deals.functions";
import { listMyCompetitorUrls } from "@/lib/business-competitor-urls.functions";

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
    case "website":
      return {
        title: "Add your business website",
        desc: "Required — so our price-match scanner can exclude your own site from competitor scans.",
      };
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
  const rulesFn = useServerFn(getMyCollabRules);
  const dealsFn = useServerFn(listMyDeals);
  const urlsFn = useServerFn(listMyCompetitorUrls);

  const { data: agreement } = useQuery({
    queryKey: ["agreement-status"],
    queryFn: () => agreementFn(),
  });
  const { data: bookable } = useQuery({
    queryKey: ["bookable-status", user?.id],
    queryFn: () => bookableFn({ data: { businessId: user!.id } }),
    enabled: !!user?.id,
  });
  const { data: collabRules } = useQuery({
    queryKey: ["collab-rules"],
    queryFn: () => rulesFn(),
    enabled: !!user?.id,
  });
  const { data: myDeals } = useQuery({
    queryKey: ["my-deals"],
    queryFn: () => dealsFn(),
    enabled: !!user?.id,
  });
  const { data: competitorUrls } = useQuery({
    queryKey: ["my-competitor-urls"],
    queryFn: () => urlsFn(),
    enabled: !!user?.id,
  });
  const brokenPinCount = ((competitorUrls?.urls ?? []) as Array<{ last_status: string | null }>)
    .filter((u) => u.last_status === "broken" || u.last_status === "wrong_domain" || u.last_status === "no_price")
    .length;
  const firstDealId: string | null = (myDeals?.deals ?? [])[0]?.id ?? null;

  const accountKind: AccountKind = bookable?.accountKind ?? "unknown";
  const ALL_GATES: BookableGate[] =
    accountKind === "activity"
      ? ["website", "photos", "items", "payouts"]
      : ["photos", "items", "payouts"];
  const missing = new Set(bookable?.missing ?? ALL_GATES);

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
      id: "collab-rules",
      title: "Set your auto-accept rules",
      desc: "Tell us who to instantly accept and who lands in your inbox.",
      done: (() => {
        const rules: any = collabRules?.rules;
        if (!rules) return false;
        return (
          !!rules.auto_accept_enabled ||
          (rules.min_followers ?? 0) > 0 ||
          (rules.min_rolling_gbv_cents ?? 0) > 0 ||
          rules.manual_review_above_followers != null
        );
      })(),
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
            <div
              className={`flex items-start gap-2.5 rounded-xl px-2 py-1.5 text-sm ${
                s.done ? "opacity-60" : ""
              }`}
            >
              {s.done ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              {s.done ? (
                <div className="flex-1">
                  <div className="text-xs font-semibold line-through">{s.title}</div>
                  <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                </div>
              ) : (
                <Link to={s.to} className="flex-1 min-w-0 rounded-md -mx-1 px-1 hover:bg-primary/5">
                  <div className="text-xs font-semibold">{s.title}</div>
                  <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                </Link>
              )}
              {s.done ? (
                <span className="ml-2 mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                  Done
                </span>
              ) : (
                <Link
                  to={s.to}
                  className="ml-2 mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
                >
                  Open
                  <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
      {brokenPinCount > 0 && (
        <Link
          to="/business/price-audit"
          className="mt-2 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/15"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {brokenPinCount} pinned listing{brokenPinCount === 1 ? "" : "s"} need attention
          </span>
        </Link>
      )}
    </div>
  );
}
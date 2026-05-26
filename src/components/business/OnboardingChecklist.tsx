import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Check, Circle, Sparkles } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { getMyAgreementStatus } from "@/lib/verification.functions";
import { getBookableStatus, GATE_LABELS, GATE_LINKS, type BookableGate } from "@/lib/bookable.functions";
import { COMMISSION } from "@/lib/commission";

type Step = {
  id: string;
  title: string;
  desc: string;
  done: boolean;
  to: string;
};

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(false);
  const { user } = useAuth();
  const agreementFn = useServerFn(getMyAgreementStatus);
  const bookableFn = useServerFn(getBookableStatus);

  const { data: agreement } = useQuery({
    queryKey: ["agreement-status"],
    queryFn: () => agreementFn(),
  });
  const { data: bookable } = useQuery({
    queryKey: ["bookable-status", user?.id],
    queryFn: () => bookableFn({ data: { businessId: user!.id } }),
    enabled: !!user?.id,
  });

  const ALL_GATES: BookableGate[] = ["photos", "items", "rates", "calendar", "payouts"];
  const missing = new Set(bookable?.missing ?? ALL_GATES);

  const steps: Step[] = [
    {
      id: "agreement",
      title: "Accept business agreement",
      desc: `Confirms our ${COMMISSION.totalPct}% commission terms.`,
      done: !!agreement?.business_accepted,
      to: "/legal/business-agreement",
    },
    ...ALL_GATES.map<Step>((gate) => ({
      id: gate,
      title: GATE_LABELS[gate],
      desc: gateDescription(gate),
      done: !missing.has(gate),
      to: GATE_LINKS[gate],
    })),
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
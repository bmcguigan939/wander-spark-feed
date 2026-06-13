import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getBookableStatus, type BookableGate } from "@/lib/bookable.functions";

/**
 * Renders a green confirmation banner at the top of a gate target page once
 * the underlying gate is satisfied — gives the operator visible feedback that
 * "this step is done" and a one-tap path back to the setup checklist.
 */
export function StepCompleteBanner({
  gate,
  doneLabel = "This step is complete",
  pendingLabel,
}: {
  gate: BookableGate;
  doneLabel?: string;
  pendingLabel?: string;
}) {
  const { user } = useAuth();
  const fn = useServerFn(getBookableStatus);
  const { data } = useQuery({
    queryKey: ["bookable-status", user?.id],
    queryFn: () => fn({ data: { businessId: user!.id } }),
    enabled: !!user?.id,
  });
  if (!data) return null;
  const done = !data.missing.includes(gate);

  if (done) {
    return (
      <Link
        to="/business"
        className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm hover:bg-emerald-500/15"
      >
        <span className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" /> {doneLabel}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          Back to setup <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    );
  }

  if (!pendingLabel) return null;
  return (
    <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
      {pendingLabel}
    </div>
  );
}
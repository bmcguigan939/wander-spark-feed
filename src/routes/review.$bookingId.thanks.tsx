import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { MobileShell } from "@/components/layout/BottomNav";

export const Route = createFileRoute("/review/$bookingId/thanks")({
  head: () => ({ meta: [{ title: "Thanks for the review — Travidz" }] }),
  component: ReviewThanks,
});

function ReviewThanks() {
  return (
    <MobileShell>
      <div className="px-4 pt-16 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
        <h1 className="mt-4 text-xl font-semibold">Thanks for the review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your honest take helps other travellers — and helps great creators
          rise to the top.
        </p>
        <Link
          to="/profile"
          className="mt-8 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Back to profile
        </Link>
      </div>
    </MobileShell>
  );
}
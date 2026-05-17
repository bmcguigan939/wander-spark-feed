import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/layout/BottomNav";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/book/match/$code/thanks")({
  head: () => ({ meta: [{ title: "Booking tracked — Travidz" }] }),
  component: ThanksPage,
});

function ThanksPage() {
  const { code } = Route.useParams();
  return (
    <MobileShell>
      <div className="p-6 max-w-md mx-auto text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
        <h1 className="text-2xl font-bold">Booking tracked</h1>
        <p className="text-sm text-muted-foreground">
          We've recorded your match code <span className="font-mono text-xs">{code}</span>{" "}
          against this booking. The hotel will see it in their dashboard and confirm your
          best-price guarantee within 48 hours.
        </p>
        <p className="text-xs text-muted-foreground">
          You don't need to do anything else. We'll email you if the hotel disputes.
        </p>
        <Link
          to="/"
          className="inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Back to feed
        </Link>
      </div>
    </MobileShell>
  );
}
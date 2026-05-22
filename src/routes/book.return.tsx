import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@/components/layout/BottomNav";
import { getMyBooking } from "@/lib/booking.functions";
import { CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/book/return")({
  head: () => ({ meta: [{ title: "Booking confirmed — Travidz" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: BookReturn,
});

function BookReturn() {
  const { session_id } = Route.useSearch();
  const fetchBooking = useServerFn(getMyBooking);
  const { data, isLoading } = useQuery({
    queryKey: ["my-booking", session_id],
    queryFn: () => fetchBooking({ data: { sessionId: session_id! } }),
    enabled: !!session_id,
    refetchInterval: (q) => {
      const status = (q.state.data as any)?.booking?.status;
      return status === "paid" || status === "confirmed" ? false : 2000;
    },
  });
  const booking = (data?.booking as any) ?? null;

  return (
    <MobileShell>
      <div className="px-4 pt-10 text-center">
        {(!session_id || isLoading || !booking) && (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Confirming your booking…</p>
          </>
        )}
        {booking && booking.status !== "pending" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-4 text-xl font-semibold">Booking confirmed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {booking.deal?.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              A confirmation has been sent to {booking.customer_email ?? "your email"}.
            </p>
            <Link
              to="/profile"
              className="mt-6 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              View my bookings
            </Link>
          </>
        )}
      </div>
    </MobileShell>
  );
}
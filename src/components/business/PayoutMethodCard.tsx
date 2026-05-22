import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Banknote, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getMyPayoutMethod,
  clearPayoutMethod,
} from "@/lib/payout.functions";

export function PayoutMethodCard({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getMyPayoutMethod);
  const clearFn = useServerFn(clearPayoutMethod);
  const [confirming, setConfirming] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["payout-method"],
    queryFn: () => getFn(),
  });

  const clearMut = useMutation({
    mutationFn: () => clearFn(),
    onSuccess: () => {
      toast.success("Payout method removed");
      qc.invalidateQueries({ queryKey: ["payout-method"] });
      setConfirming(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
        <Loader2 className="inline h-4 w-4 animate-spin" /> Loading payout method…
      </div>
    );
  }

  const set = data?.payout_method === "manual_bank" && data?.bank;

  if (!set) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Add a payout method</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Travidz pays you weekly for bookings minus an 8% commission. We need
              your bank details before you can list bookable deals.
            </p>
            <Link
              to="/business/onboarding/payout"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950"
            >
              <Banknote className="h-3.5 w-3.5" /> Set up payouts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const b = data!.bank!;
  const tail =
    b.iban_last4 ? `IBAN ••••${b.iban_last4}` :
    b.account_last4 ? `Account ••••${b.account_last4}${b.sort_code_last4 ? ` · Sort ••${b.sort_code_last4}` : ""}` :
    "Bank details on file";

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Payouts set up</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{b.account_holder} · {b.country}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{tail}</p>
          {!compact && (
            <div className="mt-3 flex gap-2">
              <Link
                to="/business/onboarding/payout"
                className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-semibold"
              >
                Change
              </Link>
              {confirming ? (
                <>
                  <button
                    onClick={() => clearMut.mutate()}
                    disabled={clearMut.isPending}
                    className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:opacity-60"
                  >
                    {clearMut.isPending ? "Removing…" : "Confirm remove"}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="rounded-lg px-3 py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground"
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth";
import {
  listBusinessRedemptions,
  confirmRedemption,
  rejectRedemption,
} from "@/lib/redemptions.functions";
import { ArrowLeft, BadgeCheck, Clock, XCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/business/redemptions")({
  head: () => ({ meta: [{ title: "Booking confirmations — Travidz" }] }),
  component: BusinessRedemptions,
});

type Row = {
  id: string;
  deal_id: string;
  code: string;
  order_value_cents: number | null;
  currency: string;
  commission_rate: number | null;
  commission_cents: number | null;
  status: "pending" | "confirmed" | "rejected";
  confirmed_at: string | null;
  created_at: string;
  notes: string | null;
  deals: { title: string } | null;
  profile_user: { username: string | null; display_name: string | null } | null;
  profile_creator: { username: string | null; display_name: string | null } | null;
};

function BusinessRedemptions() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const fetchList = useServerFn(listBusinessRedemptions);
  const [filter, setFilter] = useState<"pending" | "confirmed" | "rejected" | "all">("pending");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["business-redemptions", filter],
    queryFn: () =>
      fetchList({
        data: { status: filter === "all" ? undefined : filter, limit: 50, offset: 0 },
      }),
    enabled: !!user && isBusiness,
  });

  const rows = (data?.rows ?? []) as Row[];

  if (!user || !isBusiness) return null;

  return (
    <MobileShell>
      <div className="px-4 pt-4">
        <Link to="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Booking confirmations</h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          When a traveller marks a booking, confirm with the order value so creator commission is recorded.
        </p>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {(["pending", "confirmed", "rejected", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
                filter === s
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card/40 text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && rows.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
            No {filter === "all" ? "" : filter} redemptions yet.
          </div>
        )}

        <ul className="mt-3 space-y-3">
          {rows.map((r) => (
            <RedemptionRow key={r.id} row={r} onChange={() => refetch()} />
          ))}
        </ul>
      </div>
    </MobileShell>
  );
}

function RedemptionRow({ row, onChange }: { row: Row; onChange: () => void }) {
  const qc = useQueryClient();
  const confirm = useServerFn(confirmRedemption);
  const reject = useServerFn(rejectRedemption);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [matchCode, setMatchCode] = useState("");

  const confirmMut = useMutation({
    mutationFn: () =>
      confirm({
        data: {
          id: row.id,
          orderValueCents: Math.round(parseFloat(value || "0") * 100),
          currency: row.currency,
          ...(matchCode.trim() ? { matchCode: matchCode.trim().toUpperCase() } : {}),
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error ?? "Failed to confirm");
      toast.success("Confirmed");
      setOpen(false);
      setValue("");
      setMatchCode("");
      qc.invalidateQueries({ queryKey: ["business-redemptions"] });
      onChange();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const rejectMut = useMutation({
    mutationFn: () => reject({ data: { id: row.id } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error ?? "Failed to reject");
      toast.success("Rejected");
      qc.invalidateQueries({ queryKey: ["business-redemptions"] });
      onChange();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const traveller =
    row.profile_user?.display_name ?? row.profile_user?.username ?? "Anonymous traveller";
  const creator =
    row.profile_creator?.display_name ?? row.profile_creator?.username ?? null;

  return (
    <li className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{row.deals?.title ?? "Deal"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-mono">{row.code}</span> · {traveller}
            {creator && <> · via @{creator}</>}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(row.created_at).toLocaleString()}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            {row.status === "pending" && (
              <span className="inline-flex items-center gap-1 text-amber-500">
                <Clock className="h-3 w-3" /> Pending
              </span>
            )}
            {row.status === "confirmed" && (
              <span className="inline-flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="h-3 w-3" /> Confirmed
              </span>
            )}
            {row.status === "rejected" && (
              <span className="inline-flex items-center gap-1 text-destructive">
                <XCircle className="h-3 w-3" /> Rejected
              </span>
            )}
            {row.order_value_cents != null && (
              <span className="text-muted-foreground">
                · {(row.order_value_cents / 100).toFixed(2)} {row.currency}
              </span>
            )}
            {row.commission_cents != null && (
              <span className="text-muted-foreground">
                · commission {(row.commission_cents / 100).toFixed(2)} {row.currency}
              </span>
            )}
          </div>
        </div>
      </div>
      {row.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1">Confirm</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm booking</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="val">Order value ({row.currency})</Label>
                  <Input
                    id="val"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0.00"
                  />
                  {row.commission_rate != null && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Commission rate: {row.commission_rate}% (auto-calculated on confirm)
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="mc">Price-match code (optional)</Label>
                  <Input
                    id="mc"
                    value={matchCode}
                    onChange={(e) => setMatchCode(e.target.value)}
                    placeholder="TRAVIDZ-MATCH-XXXXXXXX"
                    autoCapitalize="characters"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    If the traveller booked with a Travidz price-match code, paste it here. The booking will settle from the matched price and the code will be marked redeemed in your audit log.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => confirmMut.mutate()}
                  disabled={!value || parseFloat(value) < 0 || confirmMut.isPending}
                >
                  {confirmMut.isPending ? "Confirming…" : "Confirm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1"
            onClick={() => rejectMut.mutate()}
            disabled={rejectMut.isPending}
          >
            Reject
          </Button>
        </div>
      )}
    </li>
  );
}
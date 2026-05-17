import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  adminListPayoutRuns,
  adminGenerateDraftRuns,
  adminGetPayoutRun,
  adminUpdatePayoutRunStatus,
  adminExportPayoutRunCsv,
} from "@/lib/payouts.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Banknote, Download, FileCheck2, XCircle, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/payouts")({
  head: () => ({ meta: [{ title: "Payouts — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminPayouts,
});

const STATUSES = ["draft", "approved", "paid", "void", "all"] as const;
type Status = (typeof STATUSES)[number];

function money(cents: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format((cents ?? 0) / 100);
}

function AdminPayouts() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListPayoutRuns);
  const genFn = useServerFn(adminGenerateDraftRuns);
  const [status, setStatus] = useState<Status>("draft");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payouts", status],
    queryFn: () => listFn({ data: { status } }),
  });

  const generate = useMutation({
    mutationFn: () => genFn({ data: {} }),
    onSuccess: (r: any) => {
      if (!r.ok) return toast.error(r.error ?? "Failed");
      toast.success(`Created ${r.created} draft run${r.created === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const runs = (data?.runs ?? []) as any[];

  return (
    <div className="px-4 py-6 pb-28">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Payouts</h2>
        </div>
        <Button size="sm" onClick={() => generate.mutate()} disabled={generate.isPending}>
          {generate.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          Generate weekly drafts
        </Button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
              status === s
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card/40 text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && runs.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          No payout runs in this filter.
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {runs.map((r) => {
          const handle = r.profiles?.username ?? r.profiles?.display_name ?? r.creator_id.slice(0, 8);
          return (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">@{handle}</p>
                <p className="text-xs text-muted-foreground">
                  {r.period_start} → {r.period_end} · {r.redemption_count} bookings
                </p>
                <p className="mt-1 text-xs">
                  <StatusPill s={r.status} />
                  {r.external_reference && (
                    <span className="ml-2 text-muted-foreground">ref: {r.external_reference}</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{money(r.total_cents, r.currency)}</p>
                <Button size="sm" variant="ghost" onClick={() => setOpenId(r.id)}>
                  Open
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {openId && <PayoutRunDialog id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const cls: Record<string, string> = {
    draft: "bg-amber-500/15 text-amber-600",
    approved: "bg-sky-500/15 text-sky-600",
    paid: "bg-emerald-500/15 text-emerald-600",
    void: "bg-muted text-muted-foreground line-through",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${cls[s] ?? "bg-muted"}`}>
      {s}
    </span>
  );
}

function PayoutRunDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetPayoutRun);
  const updateFn = useServerFn(adminUpdatePayoutRunStatus);
  const csvFn = useServerFn(adminExportPayoutRunCsv);
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payout-run", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const update = useMutation({
    mutationFn: (action: "approve" | "mark_paid" | "void") =>
      updateFn({
        data: {
          id,
          action,
          external_reference: action === "mark_paid" ? ref : undefined,
          notes: notes || undefined,
        },
      }),
    onSuccess: (r: any) => {
      if (!r.ok) return toast.error(r.error ?? "Failed");
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
      qc.invalidateQueries({ queryKey: ["admin-payout-run", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const downloadCsv = async () => {
    const { csv, filename } = await csvFn({ data: { id } });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const run = (data as any)?.run;
  const items = (data as any)?.items ?? [];
  const details = (data as any)?.details;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payout run</DialogTitle>
        </DialogHeader>
        {isLoading || !run ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold">@{run.profiles?.username ?? run.creator_id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">
                {run.period_start} → {run.period_end} · {run.redemption_count} bookings ·{" "}
                <span className="font-bold text-primary">{money(run.total_cents, run.currency)}</span>
              </p>
              <p className="mt-1"><StatusPill s={run.status} /></p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Payout details</p>
              {details ? (
                <div className="mt-1 space-y-0.5 text-xs">
                  <p>{details.account_holder_name ?? <em className="text-muted-foreground">no name</em>}</p>
                  <p>{details.bank_name} {details.country && `· ${details.country}`}</p>
                  {details.iban && <p>IBAN: {details.iban}</p>}
                  {details.sort_code && <p>Sort: {details.sort_code} · Acc: {details.account_number}</p>}
                  {details.swift_bic && <p>SWIFT: {details.swift_bic}</p>}
                  {details.payout_email && <p>Email: {details.payout_email}</p>}
                </div>
              ) : (
                <p className="mt-1 text-xs italic text-destructive">Creator has not provided bank details.</p>
              )}
            </div>

            <details className="rounded-lg border border-border p-3 text-xs">
              <summary className="cursor-pointer font-semibold">{items.length} line items</summary>
              <ul className="mt-2 divide-y divide-border">
                {items.map((i: any) => (
                  <li key={i.id} className="flex items-center justify-between py-1">
                    <span className="truncate">
                      <span className="font-mono">{i.deal_redemptions?.code}</span> · {i.deal_redemptions?.deals?.title}
                    </span>
                    <span className="font-semibold">{money(i.commission_cents, i.currency)}</span>
                  </li>
                ))}
              </ul>
            </details>

            {run.status !== "paid" && run.status !== "void" && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <Label className="text-xs">Bank reference (required to mark paid)</Label>
                <Input
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="e.g. TXN-2026-05-17-001"
                />
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={downloadCsv}>
                <Download className="mr-1 h-3 w-3" /> CSV
              </Button>
              {run.status === "draft" && (
                <Button size="sm" onClick={() => update.mutate("approve")} disabled={update.isPending}>
                  <FileCheck2 className="mr-1 h-3 w-3" /> Approve
                </Button>
              )}
              {(run.status === "draft" || run.status === "approved") && (
                <>
                  <Button
                    size="sm"
                    onClick={() => update.mutate("mark_paid")}
                    disabled={update.isPending || ref.trim().length < 3}
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Mark paid
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update.mutate("void")}
                    disabled={update.isPending}
                  >
                    <XCircle className="mr-1 h-3 w-3" /> Void
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
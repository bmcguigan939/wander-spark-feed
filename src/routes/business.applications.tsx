import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/BottomNav";
import {
  listApplicationsForBusiness,
  decideApplication,
} from "@/lib/deal-applications.functions";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Check, X, Clock, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/business/applications")({
  head: () => ({ meta: [{ title: "Applications — Travidz" }] }),
  component: BusinessApplications,
});

function BusinessApplications() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const fetch = useServerFn(listApplicationsForBusiness);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["business-applications"],
    queryFn: () => fetch({ data: {} }),
    enabled: !!user && isBusiness,
  });
  const apps = (data?.applications ?? []) as any[];

  if (!user || !isBusiness) return null;

  return (
    <MobileShell>
      <div className="px-4 pt-6">
        <Link to="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="mt-3 text-xl font-semibold">Creator Applications</h1>

        {isLoading && (
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        )}

        {!isLoading && apps.length === 0 && (
          <div className="mt-10 rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          </div>
        )}

        <ul className="mt-4 space-y-3 pb-24">
          {apps.map((a) => (
            <ApplicationCard key={a.id} app={a} />
          ))}
        </ul>
      </div>
    </MobileShell>
  );
}

function ApplicationCard({ app }: { app: any }) {
  const qc = useQueryClient();
  const decide = useServerFn(decideApplication);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(app.requested_code ?? "");
  const [commission, setCommission] = useState("");

  const decideMut = useMutation({
    mutationFn: (decision: "approved" | "declined") =>
      decide({
        data: {
          id: app.id,
          decision,
          approvedCode: decision === "approved" ? (code.trim() || undefined) : undefined,
          commissionPct:
            decision === "approved" && commission ? Number(commission) : undefined,
        },
      }),
    onSuccess: (_d, decision) => {
      toast.success(decision === "approved" ? "Application approved" : "Application declined");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["business-applications"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <li className="rounded-xl border border-border bg-card/40 p-3">
      <div className="flex items-center gap-3">
        {app.creator?.avatar_url ? (
          <img src={app.creator.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <Link
            to="/u/$username"
            params={{ username: app.creator?.username ?? "" }}
            className="block truncate text-sm font-medium"
          >
            {app.creator?.display_name ?? `@${app.creator?.username}`}
          </Link>
          <Link
            to="/deals/$id"
            params={{ id: app.deal_id }}
            className="block truncate text-xs text-muted-foreground"
          >
            for {app.deal?.title}
          </Link>
        </div>
        <StatusBadge status={app.status} />
      </div>
      {app.pitch && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/85">{app.pitch}</p>
      )}
      {app.requested_code && (
        <p className="mt-2 text-xs text-muted-foreground">
          Requested code: <span className="font-mono">{app.requested_code}</span>
        </p>
      )}
      {app.status === "approved" && (
        <p className="mt-2 text-xs">
          Code: <span className="font-mono">{app.approved_code ?? "—"}</span>
          {app.commission_pct != null && <> · {app.commission_pct}% commission</>}
        </p>
      )}
      {app.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="default" onClick={() => setOpen(true)}>
            <Check className="mr-1 h-3.5 w-3.5" /> Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => decideMut.mutate("declined")}
            disabled={decideMut.isPending}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Decline
          </Button>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve application</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="code">Promo code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CREATOR10"
                maxLength={40}
              />
            </div>
            <div>
              <Label htmlFor="commission">Commission %</Label>
              <Input
                id="commission"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => decideMut.mutate("approved")} disabled={decideMut.isPending}>
              {decideMut.isPending ? "Saving…" : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: any; cls: string; label: string }> = {
    pending: { icon: Clock, cls: "text-amber-500 bg-amber-500/10", label: "Pending" },
    approved: { icon: CheckCircle2, cls: "text-emerald-500 bg-emerald-500/10", label: "Approved" },
    declined: { icon: XCircle, cls: "text-destructive bg-destructive/10", label: "Declined" },
    withdrawn: { icon: XCircle, cls: "text-muted-foreground bg-muted/40", label: "Withdrawn" },
  };
  const s = map[status] ?? map.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${s.cls}`}>
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}
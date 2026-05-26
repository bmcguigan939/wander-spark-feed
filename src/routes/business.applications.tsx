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
import { oneTapAcceptApplication } from "@/lib/collabs.functions";
import { draftApplicationReply } from "@/lib/outreach.functions";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Check, X, Clock, CheckCircle2, XCircle, Sparkles, Copy, Zap } from "lucide-react";
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
  const [filter, setFilter] = useState<"all" | "pending" | "auto">("all");

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
  const visible = apps.filter((a) => {
    if (filter === "pending") return a.status === "pending";
    if (filter === "auto") return a.auto_decided === true;
    return true;
  });

  if (!user || !isBusiness) return null;

  return (
    <MobileShell>
      <div className="px-4 pt-6">
        <Link to="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="mt-3 text-xl font-semibold">Creator Applications</h1>
        <div className="mt-3 flex gap-2 text-xs">
          {(["all", "pending", "auto"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 border ${
                filter === f
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {f === "auto" ? "✨ Auto-accepted" : f === "pending" ? "Pending" : "All"}
            </button>
          ))}
          <Link
            to="/business/collabs"
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-muted-foreground"
          >
            <Zap className="h-3 w-3" /> Defaults & rules
          </Link>
        </div>

        {isLoading && (
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        )}

        {!isLoading && visible.length === 0 && (
          <div className="mt-10 rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No applications to show.</p>
          </div>
        )}

        <ul className="mt-4 space-y-3 pb-24">
          {visible.map((a) => (
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
  const draftFn = useServerFn(draftApplicationReply);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(app.requested_code ?? "");
  const [commission, setCommission] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyDecision, setReplyDecision] = useState<"approved" | "declined">("approved");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const draftMut = useMutation({
    mutationFn: (decision: "approved" | "declined") =>
      draftFn({ data: { applicationId: app.id, decision } }),
    onSuccess: (d, decision) => {
      setReplyDecision(decision);
      setDraftSubject(d.subject);
      setDraftBody(d.body);
      setReplyOpen(true);
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't draft reply"),
  });

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
          <Button
            size="sm"
            variant="outline"
            onClick={() => draftMut.mutate("approved")}
            disabled={draftMut.isPending}
            className="ml-auto"
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            {draftMut.isPending ? "Drafting…" : "Draft reply"}
          </Button>
        </div>
      )}
      {app.status !== "pending" && app.creator?.username && (
        <div className="mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => draftMut.mutate(app.status === "approved" ? "approved" : "declined")}
            disabled={draftMut.isPending}
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            {draftMut.isPending ? "Drafting…" : "Draft message"}
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
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              AI {replyDecision === "approved" ? "approval" : "decline"} draft
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="d-subject">Subject</Label>
              <Input
                id="d-subject"
                value={draftSubject}
                onChange={(e) => setDraftSubject(e.target.value)}
                maxLength={160}
              />
            </div>
            <div>
              <Label htmlFor="d-body">Message</Label>
              <textarea
                id="d-body"
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={10}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(`${draftSubject}\n\n${draftBody}`);
                toast.success("Copied to clipboard");
              }}
            >
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy
            </Button>
            <Button
              onClick={() => {
                const href = `mailto:?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftBody)}`;
                window.location.href = href;
              }}
            >
              Open in email
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
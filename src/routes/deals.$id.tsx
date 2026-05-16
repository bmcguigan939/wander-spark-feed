import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/BottomNav";
import { getDeal, logDealClick } from "@/lib/deals.functions";
import {
  applyForDeal,
  getMyApplicationForDeal,
  withdrawApplication,
} from "@/lib/deal-applications.functions";
import { useAuth } from "@/lib/auth";
import { MapPin, ExternalLink, ArrowLeft, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/deals/$id")({
  component: DealDetail,
});

function DealDetail() {
  const { id } = Route.useParams();
  const { user, isCreator } = useAuth();
  const fetchDeal = useServerFn(getDeal);
  const logClick = useServerFn(logDealClick);

  const { data, isLoading, error } = useQuery({
    queryKey: ["deal", id],
    queryFn: () => fetchDeal({ data: { id } }),
    retry: false,
  });
  const deal = data?.deal as any;

  const onView = async () => {
    try {
      await logClick({ data: { dealId: id, userId: user?.id } });
    } catch {}
    if (deal?.url) window.open(deal.url, "_blank", "noopener,noreferrer");
  };

  return (
    <MobileShell>
      <div className="px-4 pt-4">
        <Link to="/deals" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> All deals
        </Link>
        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="mt-6 text-sm text-destructive">Deal not found.</p>}
        {deal && (
          <div className="mt-4">
            {deal.image_url && (
              <img src={deal.image_url} alt={deal.title} className="aspect-video w-full rounded-2xl object-cover" />
            )}
            <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{[deal.city, deal.country].filter(Boolean).join(", ") || deal.destination || "Anywhere"}</span>
            </div>
            <h1 className="mt-1 text-xl font-semibold">{deal.title}</h1>
            {deal.discount_label && (
              <span className="mt-2 inline-block rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                {deal.discount_label}
              </span>
            )}
            {deal.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{deal.description}</p>
            )}
            <button
              onClick={onView}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30"
            >
              <ExternalLink className="h-4 w-4" /> View deal
            </button>
            {user && isCreator && deal.business_id !== user.id && (
              <CreatorApplyBlock dealId={id} />
            )}
            {deal.business && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                by{" "}
                <Link to="/u/$username" params={{ username: deal.business.username }} className="underline">
                  @{deal.business.username}
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function CreatorApplyBlock({ dealId }: { dealId: string }) {
  const qc = useQueryClient();
  const fetchApp = useServerFn(getMyApplicationForDeal);
  const apply = useServerFn(applyForDeal);
  const withdraw = useServerFn(withdrawApplication);
  const [open, setOpen] = useState(false);
  const [pitch, setPitch] = useState("");
  const [requestedCode, setRequestedCode] = useState("");

  const { data } = useQuery({
    queryKey: ["my-deal-application", dealId],
    queryFn: () => fetchApp({ data: { dealId } }),
  });
  const app = data?.application as any;

  const applyMut = useMutation({
    mutationFn: () =>
      apply({
        data: {
          dealId,
          pitch: pitch.trim(),
          requestedCode: requestedCode.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Application submitted");
      setOpen(false);
      setPitch("");
      setRequestedCode("");
      qc.invalidateQueries({ queryKey: ["my-deal-application", dealId] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to apply"),
  });

  const withdrawMut = useMutation({
    mutationFn: () => withdraw({ data: { id: app.id } }),
    onSuccess: () => {
      toast.success("Application withdrawn");
      qc.invalidateQueries({ queryKey: ["my-deal-application", dealId] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to withdraw"),
  });

  if (app) {
    return (
      <div className="mt-4 rounded-xl border border-border bg-card/40 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          {app.status === "pending" && <Clock className="h-4 w-4 text-amber-500" />}
          {app.status === "approved" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {app.status === "declined" && <XCircle className="h-4 w-4 text-destructive" />}
          {app.status === "withdrawn" && <XCircle className="h-4 w-4 text-muted-foreground" />}
          <span className="capitalize">{app.status}</span>
        </div>
        {app.status === "approved" && app.approved_code && (
          <p className="mt-2 text-sm">
            Your promo code: <span className="font-mono font-semibold">{app.approved_code}</span>
          </p>
        )}
        {app.status === "approved" && app.commission_pct != null && (
          <p className="text-xs text-muted-foreground">Commission: {app.commission_pct}%</p>
        )}
        {app.pitch && (
          <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{app.pitch}</p>
        )}
        {app.status === "pending" && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => withdrawMut.mutate()}
            disabled={withdrawMut.isPending}
          >
            Withdraw
          </Button>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <Send className="h-4 w-4" /> Apply to promote this deal
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply to promote</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="pitch">Your pitch</Label>
            <Textarea
              id="pitch"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Tell the business who your audience is and how you'd promote this deal…"
              rows={5}
              maxLength={1500}
            />
            <p className="mt-1 text-xs text-muted-foreground">{pitch.length}/1500</p>
          </div>
          <div>
            <Label htmlFor="code">Requested promo code (optional)</Label>
            <Input
              id="code"
              value={requestedCode}
              onChange={(e) => setRequestedCode(e.target.value)}
              placeholder="e.g. YOURHANDLE10"
              maxLength={40}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => applyMut.mutate()}
            disabled={pitch.trim().length < 10 || applyMut.isPending}
          >
            {applyMut.isPending ? "Submitting…" : "Submit application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
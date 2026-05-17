import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import {
  acceptInvite,
  declineInvite,
  getInviteByToken,
} from "@/lib/business-invites.functions";
import { useAuth } from "@/lib/auth";
import { COMMISSION } from "@/lib/commission";

export const Route = createFileRoute("/business/invite/$token")({
  head: () => ({ meta: [{ title: "You're invited to Travidz" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading } = useAuth();

  const getFn = useServerFn(getInviteByToken);
  const acceptFn = useServerFn(acceptInvite);
  const declineFn = useServerFn(declineInvite);

  const { data, isLoading, error } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => getFn({ data: { token } }),
  });

  const [declineReason, setDeclineReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);

  const acceptM = useMutation({
    mutationFn: () => acceptFn({ data: { token } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invite", token] });
      toast.success("Welcome to Travidz — your listing is live");
      navigate({ to: "/business" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't accept invite"),
  });

  const declineM = useMutation({
    mutationFn: () => declineFn({ data: { token, reason: declineReason || undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invite", token] });
      toast("Thanks — we let the creator know");
      setShowDecline(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-6 pt-24 text-center">
        <XCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 font-display text-xl font-semibold">Invite not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This invite link may have expired or been revoked.
        </p>
      </div>
    );
  }

  const { invite, creator, video } = data;
  const creatorName = creator?.display_name || creator?.username || "A Travidz creator";

  if (invite.status === "accepted") {
    return (
      <Status
        icon={<CheckCircle2 className="h-10 w-10 text-emerald-500" />}
        title="Listing already claimed"
        body={`${invite.business_name} is already live on Travidz.`}
      />
    );
  }
  if (invite.status === "declined") {
    return (
      <Status
        icon={<XCircle className="h-10 w-10 text-muted-foreground" />}
        title="Invite declined"
        body="No further action needed."
      />
    );
  }
  if (invite.status === "expired") {
    return (
      <Status
        icon={<XCircle className="h-10 w-10 text-muted-foreground" />}
        title="Invite expired"
        body={`Reach out to ${creatorName} on Travidz to request a new one.`}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 pb-16 pt-8">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <Building2 className="h-3.5 w-3.5" /> You're invited
      </div>
      <h1 className="mt-2 font-display text-2xl font-semibold leading-tight">
        {creatorName} featured{" "}
        <span className="text-primary">{invite.business_name}</span> on Travidz
      </h1>

      {video ? (
        <div className="mt-5 flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
            {video.thumbnail_url ? (
              <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{video.title}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {video.view_count.toLocaleString()} views · {video.like_count.toLocaleString()} likes
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <h2 className="font-display text-base font-semibold">The offer</h2>
        <p className="mt-2 text-sm leading-relaxed">
          {creatorName} would like to advertise your direct website on Travidz
          for a <strong>{invite.commission_pct}% commission fee on any sales
          directed through them</strong>.
        </p>
        <ul className="mt-3 space-y-1.5 text-[13px] text-muted-foreground">
          <li>✓ No setup fee, no monthly cost</li>
          <li>✓ You only pay when we send you a paying customer</li>
          <li>✓ Your direct website stays the destination — no rebranding</li>
          <li>✓ Best Price Guarantee — Travidz auto-matches any cheaper third-party rate (commission deducted) and shows you every match in your audit log</li>
        </ul>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          <span className="truncate">{invite.website_url}</span>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {user ? (
          <button
            onClick={() => acceptM.mutate()}
            disabled={acceptM.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
          >
            {acceptM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Accept & claim your listing
          </button>
        ) : (
          <Link
            to="/login"
            className="inline-flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            Sign in to accept
          </Link>
        )}

        {!showDecline ? (
          <button
            onClick={() => setShowDecline(true)}
            className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background py-2.5 text-xs font-semibold text-muted-foreground"
          >
            Not interested
          </button>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-3">
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Optional: tell the creator why"
              maxLength={500}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setShowDecline(false)}
                className="flex-1 rounded-full border border-border bg-background py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => declineM.mutate()}
                disabled={declineM.isPending}
                className="flex-1 rounded-full bg-destructive py-2 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
              >
                Confirm decline
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? null : null}
    </div>
  );
}

function Status({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-md px-6 pt-24 text-center">
      <div className="flex justify-center">{icon}</div>
      <h1 className="mt-4 font-display text-xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, CheckCircle2, Loader2, MessageSquare, PlayCircle, XCircle } from "lucide-react";
import {
  acceptInvite,
  checkInviteAccountState,
  declineInvite,
  getInviteByToken,
} from "@/lib/business-invites.functions";
import {
  getThreadByInviteToken,
  postReplyByInviteToken,
} from "@/lib/business-threads.functions";
import { useAuth } from "@/lib/auth";
import { COMMISSION } from "@/lib/commission";
import { ThreadConversation } from "@/components/threads/ThreadConversation";

export const Route = createFileRoute("/business/invite/$token")({
  head: () => ({ meta: [{ title: "You're invited to Travidz" }] }),
  component: InvitePage,
});

function InvitePage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const { signOut, refreshRoles } = useAuth();
  const navigate = useNavigate();

  const getFn = useServerFn(getInviteByToken);
  const acceptFn = useServerFn(acceptInvite);
  const declineFn = useServerFn(declineInvite);
  const checkFn = useServerFn(checkInviteAccountState);
  const getThreadFn = useServerFn(getThreadByInviteToken);
  const replyFn = useServerFn(postReplyByInviteToken);

  const { data, isLoading, error } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => getFn({ data: { token } }),
  });

  const accountQ = useQuery({
    queryKey: ["invite-account-state", token],
    queryFn: () => checkFn({ data: { token } }),
  });

  const [agreed, setAgreed] = useState(false);

  const threadQ = useQuery({
    queryKey: ["invite-thread", token],
    queryFn: () => getThreadFn({ data: { token } }),
    refetchInterval: 20_000,
  });

  const [replyEmail, setReplyEmail] = useState("");
  const replyM = useMutation({
    mutationFn: (body: string) =>
      replyFn({ data: { token, body, senderEmail: replyEmail || undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invite-thread", token] });
      toast.success("Reply sent to the creator");
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't send"),
  });

  const [declineReason, setDeclineReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);

  const acceptM = useMutation({
    mutationFn: () => acceptFn({ data: { token } }),
    onMutate: () => {
      // eslint-disable-next-line no-console
      console.info("[acceptInvite] POST starting", { token });
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["invite", token] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      if (data?.video?.id) {
        qc.invalidateQueries({ queryKey: ["video", data.video.id] });
      }
      await refreshRoles();
      toast.success("Welcome to Travidz — your listing is live");
    },
    onError: (e: any) => {
      // eslint-disable-next-line no-console
      console.error("[acceptInvite] failed", e);
      toast.error(e?.message ?? "Couldn't accept invite");
    },
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

  const inviteEmail = accountQ.data?.email?.toLowerCase() ?? "";
  const currentEmail = (user?.email ?? "").toLowerCase();
  const wrongAccount = !!user && !!inviteEmail && currentEmail !== inviteEmail;

  // Auto-route the business to login (with email prefilled) whenever the
  // current browser session doesn't match the invited email. Must run BEFORE
  // any early return so hook order stays stable across renders.
  useEffect(() => {
    if (!accountQ.data || !inviteEmail) return;
    if (data?.invite && data.invite.status !== "pending") return;
    if (!user) {
      navigate({
        to: "/login",
        search: { invite: token, email: inviteEmail } as any,
        replace: true,
      });
      return;
    }
    if (wrongAccount) {
      (async () => {
        try { await signOut(); } catch {}
        navigate({
          to: "/login",
          search: { invite: token, email: inviteEmail } as any,
          replace: true,
        });
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountQ.data, inviteEmail, user?.id, wrongAccount]);

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

  const isReturning = !!data.isReturningBusiness;
  const canAccept = isReturning || agreed;

  const handleAcceptClick = () => {
    // eslint-disable-next-line no-console
    console.info("[acceptInvite] click", { canAccept, agreed, hasUser: !!user });
    if (!isReturning && !agreed) {
      toast.error("Please tick the agreement box to continue.");
      return;
    }
    acceptM.mutate();
  };

  const threadBlock = threadQ.data?.thread ? (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <MessageSquare className="mr-1 inline h-3 w-3" /> Conversation with {creatorName}
      </div>
      <ThreadConversation
        thread={threadQ.data.thread as any}
        messages={threadQ.data.messages}
        creator={threadQ.data.creator}
        business={{ display_name: invite.business_name }}
        viewerKind="business"
        canReply={invite.status !== "expired"}
        isPosting={replyM.isPending}
        onSend={async (b) => { await replyM.mutateAsync(b); }}
        emailFieldVisible
        emailValue={replyEmail}
        onEmailChange={setReplyEmail}
      />
    </div>
  ) : null;

  if (invite.status === "accepted" || acceptM.isSuccess) {
    return (
      <div className="mx-auto max-w-md px-5 pb-16 pt-8">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h1 className="mt-3 font-display text-xl font-semibold">
            You're live on Travidz
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {invite.business_name} is now featured. Customers booking through{" "}
            {creatorName}'s videos check out on your Travidz-hosted store.
          </p>
        </div>
        <div className="mt-5 space-y-2">
          <Link
            to="/business"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            Open your dashboard
          </Link>
          {video?.id ? (
            <Link
              to="/feed/playlist"
              search={{ ids: [video.id], start: video.id } as any}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-semibold"
            >
              <PlayCircle className="h-4 w-4" /> See it on {creatorName}'s video
            </Link>
          ) : null}
        </div>
        {threadBlock}
      </div>
    );
  }
  if (invite.status === "declined") {
    return (
      <div className="mx-auto max-w-md px-5 pb-16 pt-8">
        <Status
          icon={<XCircle className="h-10 w-10 text-muted-foreground" />}
          title="Invite declined"
          body="No further action needed — you can still message the creator below."
        />
        {threadBlock}
      </div>
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

      {isReturning ? (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Welcome back
          </div>
          <h2 className="mt-1 font-display text-base font-semibold">
            One tap to add {creatorName} to your creators
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            No new setup. Your booking page, payouts and Best Price Guarantee
            carry over. The same {invite.commission_pct}% commission applies —
            only on bookings {creatorName} sends you.
          </p>
        </div>
      ) : (
        <>
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
              <li>✓ Your store lives on Travidz — no website needed; we host the booking page</li>
              <li>✓ Best Price Guarantee — Travidz auto-matches any cheaper third-party rate (commission deducted) and shows you every match in your audit log</li>
            </ul>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display text-base font-semibold">
              What happens after you accept
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">One setup, then it's just a tap.</span>{" "}
              Once you accept, any other Travidz creator who features your
              business can be added with a single tap from your dashboard — no
              new forms, no new payout details, no new agreement.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">More creators = more global reach.</span>{" "}
              Every additional creator you accept puts your listing in front of
              their audience, in their language, in the cities they travel to.
              There's no cap and no extra cost — you still only pay commission
              on bookings we send you.
            </p>
          </div>
        </>
      )}

      <div className="mt-6 space-y-2">
        {isReturning ? (
          <p className="px-1 text-[12px] leading-snug text-muted-foreground">
            You already accepted the{" "}
            <a
              href="/legal/business-agreement"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2"
            >
              Travidz Business Agreement
            </a>{" "}
            — it stays in force for new creator collabs.
          </p>
        ) : (
          <label className="flex items-start gap-2 rounded-2xl border border-border bg-card p-3 text-[13px] leading-snug">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span className="text-muted-foreground">
              I have read and agree to the{" "}
              <a
                href="/legal/business-agreement"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2"
              >
                Travidz Business Agreement
              </a>
              .
            </span>
          </label>
        )}

        {user ? (
          wrongAccount ? (
            <div className="rounded-2xl border border-border bg-card p-3 text-center text-[13px] text-muted-foreground">
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              <p className="mt-2">Switching to the invited account…</p>
            </div>
          ) : (
          <button
            onClick={handleAcceptClick}
            disabled={acceptM.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
          >
            {acceptM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isReturning
              ? `Accept — add ${creatorName} to your creators`
              : "Accept & claim your listing"}
          </button>
          )
        ) : (
          <button
            disabled
            className="inline-flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground opacity-50"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
          </button>
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
      {threadBlock}
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
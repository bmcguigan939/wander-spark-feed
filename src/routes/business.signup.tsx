import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptInvite,
  checkInviteAccountState,
} from "@/lib/business-invites.functions";

const searchSchema = z.object({
  invite: z.string().min(8).max(128).optional(),
});

export const Route = createFileRoute("/business/signup")({
  head: () => ({ meta: [{ title: "Create your business account — Travidz" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: BusinessSignupPage,
});

function BusinessSignupPage() {
  const { invite } = Route.useSearch();
  const navigate = useNavigate();
  const checkFn = useServerFn(checkInviteAccountState);
  const acceptFn = useServerFn(acceptInvite);

  const stateQ = useQuery({
    queryKey: ["invite-account-state", invite],
    queryFn: () => checkFn({ data: { token: invite! } }),
    enabled: !!invite,
  });

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!invite) {
    return (
      <div className="mx-auto max-w-md px-6 pt-24 text-center">
        <h1 className="font-display text-xl font-semibold">No invite token</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is reached through a business invite link.
        </p>
      </div>
    );
  }

  if (stateQ.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const email = stateQ.data?.email ?? "";
  const accountExists = stateQ.data?.accountExists;

  if (accountExists) {
    return (
      <div className="mx-auto max-w-md px-6 pt-24 text-center">
        <h1 className="font-display text-xl font-semibold">
          You already have an account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A Travidz account already exists for{" "}
          <span className="font-medium text-foreground">{email}</span>. Log in to
          see your new listing and accept the contract.
        </p>
        <Link
          to="/login"
          search={{ invite, next: `/business/invite/${invite}` } as any}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          Log in to continue
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    if (!agreed) return setError("Please accept the Business Agreement to continue.");
    setLoading(true);

    const inviteUrl = `${window.location.origin}/business/invite/${invite}`;
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: inviteUrl },
    });

    if (err) {
      setLoading(false);
      if (/already (registered|exists)/i.test(err.message)) {
        setError("This email already has an account — please log in instead.");
      } else {
        setError(err.message);
      }
      return;
    }

    if (data.session) {
      try {
        await acceptFn({ data: { token: invite!, agreementVersion: "v1" } });
      } catch (e: any) {
        setLoading(false);
        setError(e?.message ?? "Couldn't accept the invite. Try again from the invite page.");
        return;
      }
      navigate({ to: "/business" });
    } else {
      setLoading(false);
      setError(
        "Account created — check your email to confirm, then return to the invite link to accept.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 pb-16 pt-10">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <Building2 className="h-3.5 w-3.5" /> Create your business account
      </div>
      <h1 className="mt-2 font-display text-2xl font-semibold leading-tight">
        Set a password to claim your listing
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your email is already on file from the invite — just choose a password.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Email</label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Password</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Confirm password</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </div>

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

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create account & accept
        </button>

        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          Already have a Travidz account?{" "}
          <Link
            to="/login"
            search={{ invite, next: `/business/invite/${invite}` } as any}
            className="font-medium text-primary underline underline-offset-2"
          >
            Log in instead
          </Link>
        </p>
      </form>
    </div>
  );
}
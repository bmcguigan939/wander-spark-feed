import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptInvite,
  checkInviteAccountState,
} from "@/lib/business-invites.functions";
import { updateMyOperatorSite } from "@/lib/operator-site.functions";
import { checkOperatorSiteUrl, type OperatorSiteCheck } from "@/lib/operator-site-check.functions";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { scorePassword } from "@/lib/password-strength";

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
  const saveOperatorSite = useServerFn(updateMyOperatorSite);
  const checkSiteFn = useServerFn(checkOperatorSiteUrl);

  const stateQ = useQuery({
    queryKey: ["invite-account-state", invite],
    queryFn: () => checkFn({ data: { token: invite! } }),
    enabled: !!invite,
  });

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [operatorSiteUrl, setOperatorSiteUrl] = useState("");
  const [siteCheck, setSiteCheck] = useState<OperatorSiteCheck | null>(null);
  const [checkingSite, setCheckingSite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Debounced server-side reachability check — iframes don't work because
  // most booking engines send X-Frame-Options: DENY, so we render a card.
  useEffect(() => {
    const url = operatorSiteUrl.trim();
    if (!/^https?:\/\/[^\s]+\.[^\s]+/.test(url)) {
      setSiteCheck(null);
      setCheckingSite(false);
      return;
    }
    let cancelled = false;
    setCheckingSite(true);
    const t = setTimeout(async () => {
      try {
        const r = await checkSiteFn({ data: { url } });
        if (!cancelled) setSiteCheck(r);
      } catch {
        if (!cancelled) setSiteCheck({ ok: false, error: "Could not reach that URL" });
      } finally {
        if (!cancelled) setCheckingSite(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [operatorSiteUrl, checkSiteFn]);

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
  const strength = scorePassword(password, email);
  const strongEnough = strength.score >= 2;

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
    if (!strongEnough)
      return setError("Please choose a stronger password (aim for at least 'Good').");
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
      } else if (/(pwned|breach|weak|leaked)/i.test(err.message)) {
        setError(
          "This password has appeared in a known data breach — please choose another.",
        );
      } else {
        setError(err.message);
      }
      return;
    }

    if (data.session) {
      try {
        await acceptFn({ data: { token: invite!, agreementVersion: "v1" } });
        if (operatorSiteUrl.trim() && siteCheck?.ok) {
          try {
            await saveOperatorSite({
              data: { operator_site_url: operatorSiteUrl.trim() },
            });
          } catch {
            // non-fatal — operator can add it later from the dashboard
          }
        }
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
          <PasswordStrengthMeter password={password} email={email} />
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

        <details className="rounded-2xl border border-border bg-card p-3 text-[13px]">
          <summary className="cursor-pointer font-medium text-foreground">
            Activity operator? Add your booking page (optional)
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            We use your website price as the base and add an 11% booking fee on top.
            We never compare against your own site — only third-party resellers.
          </p>
          <input
            type="url"
            placeholder="https://your-activity.com"
            value={operatorSiteUrl}
            onChange={(e) => {
              setOperatorSiteUrl(e.target.value);
            }}
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          {operatorSiteUrl.trim() && /^https?:\/\//.test(operatorSiteUrl.trim()) && (
            <div className="mt-3">
              {checkingSite && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking that URL…
                </div>
              )}
              {!checkingSite && siteCheck?.ok && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                  {siteCheck.faviconUrl ? (
                    <img
                      src={siteCheck.faviconUrl}
                      alt=""
                      className="h-5 w-5 rounded-sm"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {siteCheck.title ?? siteCheck.finalUrl}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {siteCheck.finalUrl}
                    </p>
                  </div>
                </div>
              )}
              {!checkingSite && siteCheck && !siteCheck.ok && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  Couldn't reach that URL{siteCheck.error ? ` — ${siteCheck.error}` : ""}. Double-check the address, or leave this blank.
                </div>
              )}
            </div>
          )}
        </details>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          disabled={loading || !strongEnough || !agreed || password !== confirm || password.length < 8}
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
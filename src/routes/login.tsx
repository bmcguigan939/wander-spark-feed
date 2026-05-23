import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Compass } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  invite: z.string().min(8).max(128).optional(),
  next: z.string().max(500).optional(),
});

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Travidz" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { invite, next } = Route.useSearch();
  const redirectTo =
    next && next.startsWith("/")
      ? next
      : invite
        ? `/business/invite/${invite}`
        : "/";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null); setLoading(true);
    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (err) return setError(err.message);
      navigate({ to: redirectTo });
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + redirectTo },
      });
      setLoading(false);
      if (err) return setError(err.message);
      if (data.session) {
        try { localStorage.removeItem("travidz:welcomed"); } catch {}
        navigate({ to: invite ? redirectTo : "/welcome" });
      } else {
        setInfo("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
      }
    }
  }

  async function google() {
    setError(null);
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + redirectTo,
    });
    if (r.error) setError(r.error.message ?? "Sign-in failed");
    else if (!r.redirected) navigate({ to: redirectTo });
  }

  async function forgot() {
    setError(null); setInfo(null);
    if (!email) return setError("Enter your email above first.");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (err) return setError(err.message);
    toast.success("Check your inbox for the reset link.");
    setInfo("Check your inbox for the reset link.");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Compass className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Travidz</h1>
        <p className="mt-1 text-sm text-muted-foreground">Discover travel through video.</p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1 text-sm font-semibold">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); setInfo(null); }}
            className={`rounded-full py-2 transition ${
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <button onClick={google} className="mb-5 w-full rounded-full border border-border bg-card py-3 text-sm font-semibold">
        Continue with Google
      </button>

      <div className="mb-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email" required placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <input
          type="password" required minLength={6} placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        {info && <p className="text-xs text-primary">{info}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button disabled={loading} className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        {mode === "signin" && (
          <button
            type="button"
            onClick={forgot}
            className="mx-auto block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot password?
          </button>
        )}
      </form>
      <p className="mt-6 px-2 text-center text-[11px] leading-relaxed text-muted-foreground">
        By continuing you agree to our{" "}
        <Link to="/legal/terms" className="underline underline-offset-2 hover:text-foreground">Terms</Link>{" "}
        and{" "}
        <Link to="/legal/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
      </p>
    </div>
  );
}

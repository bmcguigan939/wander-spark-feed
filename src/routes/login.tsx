import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Compass, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  invite: z.string().min(8).max(128).optional(),
  next: z.string().max(500).optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Travidz" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { invite, next, mode: initialMode } = Route.useSearch();
  const redirectTo =
    next && next.startsWith("/")
      ? next
      : invite
        ? `/business/invite/${invite}`
        : "/";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      navigate({ to: redirectTo as any });
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + redirectTo },
      });
      setLoading(false);
      if (err) return setError(err.message);
      if (data.session) {
        try { localStorage.removeItem("travidz:welcomed"); } catch {}
        navigate({ to: (invite ? redirectTo : "/welcome") as any });
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
    else if (!r.redirected) navigate({ to: redirectTo as any });
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
    <div className="relative isolate min-h-dvh w-full overflow-x-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[var(--sunset)] opacity-40 blur-3xl animate-blob" />
        <div className="absolute right-[-6rem] top-24 h-[24rem] w-[24rem] rounded-full bg-[var(--coral)] opacity-40 blur-3xl animate-blob [animation-delay:-4s]" />
        <div className="absolute bottom-[-8rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-[var(--twilight)] opacity-30 blur-3xl animate-blob [animation-delay:-8s]" />
      </div>
      <div className="mx-auto flex max-w-md flex-col px-6 pb-16 pt-[max(env(safe-area-inset-top),2rem)]">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Compass className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Travidz</h1>
        <p className="mt-1 text-xs text-muted-foreground">Discover travel through video.</p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-1 rounded-full border border-border bg-card/80 p-1 text-sm font-semibold backdrop-blur">
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

      <button onClick={google} className="mb-5 w-full rounded-full border border-border bg-card/80 py-3 text-sm font-semibold backdrop-blur">
        Continue with Google
      </button>

      <div className="mb-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email" required placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-border bg-card/80 px-4 py-3 text-sm outline-none backdrop-blur focus:border-primary"
          style={{ scrollMarginTop: 80, scrollMarginBottom: 120 }}
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required minLength={6} placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={(e) => {
              setTimeout(() => {
                e.target.scrollIntoView({ block: "center", behavior: "smooth" });
              }, 300);
            }}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="w-full rounded-xl border border-border bg-card/80 py-3 pl-4 pr-12 text-sm outline-none backdrop-blur focus:border-primary"
            style={{ scrollMarginTop: 80, scrollMarginBottom: 120 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
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
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { resolveRedirect } from "@/lib/redirects.functions";
import { useAuth } from "@/lib/auth";
import { ExternalLink, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/r/$code")({
  head: ({ params }) => ({ meta: [{ title: `Redirecting · ${params.code} — Travidz` }, { name: "robots", content: "noindex" }] }),
  component: RedirectPage,
});

function RedirectPage() {
  const { code } = Route.useParams();
  const { user, loading } = useAuth();
  const fn = useServerFn(resolveRedirect);
  const [state, setState] = useState<{ status: "loading" | "ready" | "missing"; url?: string | null }>({ status: "loading" });

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    fn({ data: { code, userId: user?.id ?? null } })
      .then((res) => {
        if (cancelled) return;
        if (res.url) {
          setState({ status: "ready", url: res.url });
          window.location.replace(res.url);
        } else {
          setState({ status: "missing" });
        }
      })
      .catch(() => !cancelled && setState({ status: "missing" }));
    return () => { cancelled = true; };
  }, [code, user?.id, loading, fn]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 text-center">
      {state.status === "missing" ? (
        <>
          <AlertTriangle className="mb-3 h-10 w-10 text-destructive" />
          <h1 className="text-lg font-semibold">Link not found</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">This tracking link is invalid or has been removed.</p>
          <Link to="/" className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Back to Travidz</Link>
        </>
      ) : (
        <>
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <h1 className="text-lg font-semibold">Taking you to the deal…</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Code <span className="font-mono">{code.toUpperCase()}</span></p>
          {state.url && (
            <a href={state.url} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              <ExternalLink className="h-4 w-4" /> Continue manually
            </a>
          )}
        </>
      )}
    </div>
  );
}
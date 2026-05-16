import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">This destination doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Back to feed</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  console.error(error);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" },
      { name: "theme-color", content: "#1a1530" },
      { title: "Travidz — Discover travel through video" },
      { name: "description", content: "AI-powered TikTok-style travel video feed. Discover destinations, hotels, excursions and deals from real creators." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function AuthListener() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      router.invalidate();
      qc.invalidateQueries();
      if (event === "SIGNED_IN" && session?.user) {
        let welcomed = false;
        try { welcomed = localStorage.getItem("travidz:welcomed") === "1"; } catch {}
        if (welcomed) return;
        if (typeof window !== "undefined" && window.location.pathname === "/welcome") return;
        // Only auto-redirect brand-new accounts (created in the last 10 minutes).
        const createdAt = session.user.created_at ? new Date(session.user.created_at).getTime() : 0;
        const isNew = createdAt && (Date.now() - createdAt) < 10 * 60 * 1000;
        if (!isNew) {
          try { localStorage.setItem("travidz:welcomed", "1"); } catch {}
          return;
        }
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        const roles = (data ?? []).map((r) => r.role as string);
        const onlyTraveller = roles.length > 0 && roles.every((r) => r === "traveller");
        if (onlyTraveller) {
          try { localStorage.setItem("travidz:welcomed", "1"); } catch {}
          router.navigate({ to: "/welcome" });
        } else {
          try { localStorage.setItem("travidz:welcomed", "1"); } catch {}
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [router, qc]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthListener />
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

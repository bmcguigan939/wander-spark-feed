import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { listBusinessThreads } from "@/lib/business-threads.functions";
import { useAuth } from "@/lib/auth";
import { MobileShell } from "@/components/layout/BottomNav";

export const Route = createFileRoute("/business/threads")({
  head: () => ({ meta: [{ title: "Messages — Business" }] }),
  component: BusinessThreadsPage,
});

function BusinessThreadsPage() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const fetchFn = useServerFn(listBusinessThreads);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    else if (!loading && user && !isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["business-threads"],
    queryFn: () => fetchFn(),
    enabled: !!user && !!isBusiness,
    refetchInterval: 30_000,
  });

  return (
    <MobileShell>
      <div className="px-4 pb-24 pt-6">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h1 className="font-display text-lg font-semibold">Creator conversations</h1>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Conversations with creators who invited you. These are the official record of every collaboration.
        </p>
        {isLoading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (data?.threads ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
            No conversations yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {data!.threads.map((t) => {
              const c = t.creator;
              const cname = c?.display_name || (c?.username ? `@${c.username}` : "Creator");
              return (
                <li key={t.id}>
                  <Link
                    to="/business/threads/$id"
                    params={{ id: t.id }}
                    className="block rounded-2xl border border-border bg-card p-3 shadow-soft transition hover:border-primary/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold">{cname}</div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        t.status === "accepted" ? "bg-emerald-500/10 text-emerald-600"
                        : t.status === "declined" ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                      }`}>{t.status}</span>
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">About {t.business_name}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(t.last_message_at).toLocaleString()}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}
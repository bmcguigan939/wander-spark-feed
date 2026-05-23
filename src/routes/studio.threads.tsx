import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { listCreatorThreads } from "@/lib/business-threads.functions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/studio/threads")({
  head: () => ({ meta: [{ title: "Messages — Studio" }] }),
  component: StudioThreadsPage,
});

function StudioThreadsPage() {
  const { user, loading, isCreator } = useAuth();
  const navigate = useNavigate();
  const fetchFn = useServerFn(listCreatorThreads);

  useEffect(() => {
    if (!loading && (!user || !isCreator)) navigate({ to: "/login" });
  }, [loading, user, isCreator, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["studio-threads"],
    queryFn: () => fetchFn(),
    enabled: !!user && !!isCreator,
    refetchInterval: 30_000,
  });

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Business conversations</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Every invite you send creates a permanent thread. Replies from businesses appear here — these conversations are the official record of each deal.
      </p>
      {isLoading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (data?.threads ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
          No conversations yet. Send a business invite from one of your videos to start one.
        </div>
      ) : (
        <ul className="space-y-2">
          {data!.threads.map((t) => (
            <li key={t.id}>
              <Link
                to="/studio/threads/$id"
                params={{ id: t.id }}
                className="block rounded-2xl border border-border bg-card p-3 shadow-soft transition hover:border-primary/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold">{t.business_name}</div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    t.status === "accepted" ? "bg-emerald-500/10 text-emerald-600"
                    : t.status === "declined" ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary"
                  }`}>{t.status}</span>
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{t.business_email}</div>
                {t.last_message_preview ? (
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.last_message_preview}</div>
                ) : null}
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(t.last_message_at).toLocaleString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
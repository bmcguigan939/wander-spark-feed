import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listClientErrors } from "@/lib/errors.functions";
import { Bug, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/errors")({
  head: () => ({ meta: [{ title: "Admin · Errors — Travidz" }] }),
  component: AdminErrorsPage,
});

function AdminErrorsPage() {
  const fetchFn = useServerFn(listClientErrors);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-client-errors"],
    queryFn: () => fetchFn(),
    refetchInterval: 30_000,
  });
  const errors = (data?.errors ?? []) as any[];
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="px-4 pt-5 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <Bug className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Client errors</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {errors.length} recent
        </span>
      </div>

      {isLoading && (
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-16 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </ul>
      )}

      {!isLoading && errors.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          No client errors logged. Nice.
        </div>
      )}

      <ul className="space-y-2">
        {errors.map((e) => {
          const isOpen = expanded === e.id;
          return (
            <li
              key={e.id}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <button
                onClick={() => setExpanded(isOpen ? null : e.id)}
                className="flex w-full items-start gap-2 p-3 text-left"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">{e.message}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{new Date(e.created_at).toLocaleString()}</span>
                    {e.route && <span className="truncate">@ {e.route}</span>}
                    {e.source && (
                      <span className="rounded-full bg-muted/40 px-1.5 py-0.5">
                        {e.source}
                      </span>
                    )}
                    {e.user_id && (
                      <span title={e.user_id}>
                        user {String(e.user_id).slice(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-border bg-muted/20 p-3">
                  {e.stack && (
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-[10px] leading-snug text-muted-foreground">
                      {e.stack}
                    </pre>
                  )}
                  {e.user_agent && (
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      UA: {e.user_agent}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
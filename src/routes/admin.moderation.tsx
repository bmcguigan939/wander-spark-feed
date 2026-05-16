import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listModerationFlags, resolveModerationFlag } from "@/lib/moderation.functions";
import { Check, X, ShieldAlert, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/moderation")({
  component: AdminModeration,
});

const LABEL_COLORS: Record<string, string> = {
  spam: "bg-amber-500/15 text-amber-600",
  fake_review: "bg-amber-500/15 text-amber-600",
  off_platform: "bg-orange-500/15 text-orange-600",
  hate: "bg-destructive/15 text-destructive",
  nsfw: "bg-destructive/15 text-destructive",
  other: "bg-muted text-muted-foreground",
};

function AdminModeration() {
  const qc = useQueryClient();
  const listFn = useServerFn(listModerationFlags);
  const resolveFn = useServerFn(resolveModerationFlag);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-moderation-flags"],
    queryFn: () => listFn({ data: undefined as any }),
  });

  const resolve = useMutation({
    mutationFn: (vars: { flagId: string; action: "uphold" | "dismiss" }) =>
      resolveFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-moderation-flags"] }),
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-3 px-4 py-4 pb-28">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Moderation queue</h2>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && (data?.flags ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">All clear — no pending flags.</p>
      )}
      <ul className="space-y-2">
        {(data?.flags ?? []).map((f: any) => (
          <li key={f.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${LABEL_COLORS[f.label] ?? LABEL_COLORS.other}`}>
                    {f.label}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {Math.round(f.confidence * 100)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {f.target_type} · {f.status === "auto_hidden" ? "auto-hidden" : "pending"}
                  </span>
                </div>
                {f.reason && <p className="mt-1 text-xs text-muted-foreground">{f.reason}</p>}
                <div className="mt-1.5">
                  {f.target_type === "video" ? (
                    <Link
                      to="/v/$id"
                      params={{ id: f.target_id }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
                    >
                      <Eye className="h-3 w-3" /> View video
                    </Link>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Comment {f.target_id.slice(0, 8)}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <button
                onClick={() => resolve.mutate({ flagId: f.id, action: "uphold" })}
                disabled={resolve.isPending}
                className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-semibold text-destructive disabled:opacity-50"
              >
                <Check className="h-3 w-3" /> Uphold (hide)
              </button>
              <button
                onClick={() => resolve.mutate({ flagId: f.id, action: "dismiss" })}
                disabled={resolve.isPending}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 disabled:opacity-50"
              >
                <X className="h-3 w-3" /> Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

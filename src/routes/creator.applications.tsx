import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { listMyApplications } from "@/lib/deal-applications.functions";
import { useAuth } from "@/lib/auth";
import { Clock, CheckCircle2, XCircle, MapPin, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/creator/applications")({
  head: () => ({ meta: [{ title: "My Applications — Travidz" }] }),
  component: CreatorApplications,
});

function CreatorApplications() {
  const { user, loading, isCreator } = useAuth();
  const navigate = useNavigate();
  const fetch = useServerFn(listMyApplications);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isCreator) navigate({ to: "/profile" });
  }, [loading, user, isCreator, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-applications"],
    queryFn: () => fetch(),
    enabled: !!user && isCreator,
  });
  const apps = (data?.applications ?? []) as any[];

  if (!user || !isCreator) return null;

  return (
    <MobileShell>
      <div className="px-4 pt-6">
        <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Profile
        </Link>
        <h1 className="mt-3 text-xl font-semibold">My Deal Applications</h1>

        {isLoading && (
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        )}

        {!isLoading && apps.length === 0 && (
          <div className="mt-10 rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No applications yet.</p>
            <Link
              to="/deals"
              className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Browse deals
            </Link>
          </div>
        )}

        <ul className="mt-4 space-y-3 pb-24">
          {apps.map((a) => (
            <li key={a.id}>
              <Link
                to="/deals/$id"
                params={{ id: a.deal_id }}
                className="flex gap-3 rounded-xl border border-border bg-card/40 p-3"
              >
                {a.deal?.image_url ? (
                  <img src={a.deal.image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.deal?.title ?? "Deal"}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {[a.deal?.city, a.deal?.country].filter(Boolean).join(", ") || a.deal?.destination || "—"}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    <StatusBadge status={a.status} />
                    {a.status === "approved" && a.approved_code && (
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                        {a.approved_code}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MobileShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: any; cls: string; label: string }> = {
    pending: { icon: Clock, cls: "text-amber-500 bg-amber-500/10", label: "Pending" },
    approved: { icon: CheckCircle2, cls: "text-emerald-500 bg-emerald-500/10", label: "Approved" },
    declined: { icon: XCircle, cls: "text-destructive bg-destructive/10", label: "Declined" },
    withdrawn: { icon: XCircle, cls: "text-muted-foreground bg-muted/40", label: "Withdrawn" },
  };
  const s = map[status] ?? map.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${s.cls}`}>
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}
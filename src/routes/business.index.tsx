import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { listMyDeals } from "@/lib/deals.functions";
import { useAuth } from "@/lib/auth";
import { Plus, Briefcase, Eye, Pencil } from "lucide-react";

export const Route = createFileRoute("/business/")({
  head: () => ({ meta: [{ title: "Business Portal — Travidz" }] }),
  component: BusinessDashboard,
});

function BusinessDashboard() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const fetchDeals = useServerFn(listMyDeals);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-deals"],
    queryFn: () => fetchDeals(),
    enabled: !!user && isBusiness,
  });
  const deals = data?.deals ?? [];

  if (!user || !isBusiness) return null;

  return (
    <MobileShell>
      <div className="px-4 pt-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">My Deals</h1>
          </div>
          <Link
            to="/business/deals/new"
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </Link>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && deals.length === 0 && (
          <p className="text-sm text-muted-foreground">No deals yet. Create your first one.</p>
        )}
        <ul className="space-y-3">
          {deals.map((d: any) => (
            <li
              key={d.id}
              className="overflow-hidden rounded-2xl border border-border bg-card p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 text-sm font-semibold">{d.title}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[d.city, d.country].filter(Boolean).join(", ") || d.destination || "Anywhere"}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {d.click_count} clicks</span>
                    <span className={d.is_active ? "text-emerald-500" : "text-muted-foreground"}>
                      {d.is_active ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>
                <Link
                  to="/business/deals/$id/edit"
                  params={{ id: d.id }}
                  className="rounded-full border border-border p-2 text-muted-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </MobileShell>
  );
}
import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth";
import { Shield, BarChart3, Film, Tag, Users } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Travidz" }] }),
  component: AdminLayout,
});

const TABS = [
  { to: "/admin", label: "Overview", icon: BarChart3, exact: true },
  { to: "/admin/videos", label: "Videos", icon: Film },
  { to: "/admin/deals", label: "Deals", icon: Tag },
  { to: "/admin/users", label: "Users", icon: Users },
] as const;

function AdminLayout() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) navigate({ to: "/" });
  }, [loading, user, isAdmin, navigate]);

  if (!user || !isAdmin) return null;

  return (
    <MobileShell>
      <div className="px-4 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Admin</h1>
        </div>
        <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 pb-2">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <Outlet />
    </MobileShell>
  );
}

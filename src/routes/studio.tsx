import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth";
import { Clapperboard, LayoutGrid, CalendarClock, Upload } from "lucide-react";

export const Route = createFileRoute("/studio")({
  head: () => ({ meta: [{ title: "Creator studio — Travidz" }] }),
  component: StudioLayout,
});

const tabs = [
  { to: "/studio", label: "Overview", icon: Clapperboard, exact: true },
  { to: "/studio/videos", label: "Videos", icon: LayoutGrid },
  { to: "/studio/schedule", label: "Schedule", icon: CalendarClock },
];

function StudioLayout() {
  const { user, loading, isCreator } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    else if (!loading && user && !isCreator) navigate({ to: "/create" });
  }, [loading, user, isCreator, navigate]);

  if (loading || !user || !isCreator) {
    return (
      <MobileShell>
        <div className="px-5 pt-10 text-sm text-muted-foreground">Loading studio…</div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-aurora text-white shadow-soft">
              <Clapperboard className="h-4 w-4" />
            </span>
            <div>
              <div className="eyebrow">Creator</div>
              <h1 className="font-display text-base font-semibold leading-none">Studio</h1>
            </div>
          </div>
          <Link
            to="/create"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft"
          >
            <Upload className="h-3.5 w-3.5" /> Upload
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 text-xs">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold transition ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="animate-fade-in">
        <Outlet />
      </div>
    </MobileShell>
  );
}
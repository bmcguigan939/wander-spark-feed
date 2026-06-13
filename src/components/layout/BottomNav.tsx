import { Link, useLocation } from "@tanstack/react-router";
import { Compass, Search, Map as MapIcon, Plus, Bookmark, User, Clapperboard } from "lucide-react";
import { useAuth } from "@/lib/auth";

const baseTabs = [
  { to: "/", label: "Feed", icon: Compass },
  { to: "/search", label: "Search", icon: Search },
  { to: "/map", label: "Map", icon: MapIcon },
  { to: "/create", label: "Create", icon: Plus },
  { to: "/collections", label: "Saved", icon: Bookmark },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const { isCreator } = useAuth();
  const tabs = baseTabs.map((t) =>
    t.to === "/create" && isCreator
      ? ({ to: "/studio", label: "Studio", icon: Clapperboard } as const)
      : t,
  );
  return (
    <nav className="sticky bottom-0 left-0 right-0 z-50 w-full bg-background/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_rgba(255,255,255,0.06)]">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 py-2">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const isPrimary = to === "/create" || to === "/studio";
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className="flex flex-col items-center gap-1 py-1 text-[10px] font-medium tracking-wide"
              >
                <span
                  className={
                    isPrimary
                      ? "rounded-xl bg-aurora px-3 py-1.5 text-white shadow-soft"
                      : active
                        ? "text-primary"
                        : "text-muted-foreground"
                  }
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                </span>
                <span className={active ? "text-foreground" : "text-muted-foreground"}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <main
        className="flex-1"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

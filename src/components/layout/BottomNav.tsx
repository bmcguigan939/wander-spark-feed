import { Link, useLocation } from "@tanstack/react-router";
import { Compass, Search, MapPin, Plus, Bookmark, User } from "lucide-react";

const tabs = [
  { to: "/", label: "Feed", icon: Compass },
  { to: "/search", label: "Search", icon: Search },
  { to: "/destinations", label: "Places", icon: MapPin },
  { to: "/create", label: "Create", icon: Plus },
  { to: "/collections", label: "Saved", icon: Bookmark },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 py-2">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const isCreate = to === "/create";
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className="flex flex-col items-center gap-1 py-1 text-[10px] font-medium tracking-wide"
              >
                <span
                  className={
                    isCreate
                      ? "rounded-xl bg-primary px-3 py-1.5 text-primary-foreground shadow-lg shadow-primary/30"
                      : active
                        ? "text-foreground"
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
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}

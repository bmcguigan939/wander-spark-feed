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
    <nav
      className="fixed left-1/2 z-40 w-[min(22rem,calc(100%-1.25rem))] -translate-x-1/2 rounded-full border border-border/70 bg-background/95 shadow-lg shadow-black/25 backdrop-blur-2xl"
      style={{ bottom: "max(env(safe-area-inset-bottom), 0.25rem)" }}
    >
      <ul className="flex items-stretch justify-between px-1.5 py-1">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const isPrimary = to === "/create" || to === "/studio";
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className="flex flex-col items-center gap-0.5 py-0.5 text-[9px] font-medium tracking-wide"
              >
                <span
                  className={
                    isPrimary
                      ? "rounded-lg bg-aurora px-2.5 py-1 text-white shadow-soft"
                      : active
                        ? "text-primary"
                        : "text-foreground"
                  }
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 1.8} />
                </span>
                <span className={`font-semibold ${active ? "text-primary" : "text-foreground"}`}>
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

export function MobileShell({
  children,
  fullBleed = false,
}: {
  children: React.ReactNode;
  fullBleed?: boolean;
}) {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <main
        className="flex-1"
        style={{
          paddingTop: fullBleed ? undefined : "env(safe-area-inset-top)",
          paddingBottom: fullBleed
            ? undefined
            : "calc(env(safe-area-inset-bottom) + 88px)",
        }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

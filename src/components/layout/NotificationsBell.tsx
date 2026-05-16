import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell } from "lucide-react";
import { getUnreadCount } from "@/lib/notifications.functions";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function NotificationsBell() {
  const { user } = useAuth();
  const fn = useServerFn(getUnreadCount);
  const [bump, setBump] = useState(0);
  const { data } = useQuery({
    queryKey: ["notif-unread", user?.id ?? null, bump],
    queryFn: () => fn({ data: undefined as any }),
    enabled: !!user,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => setBump((b) => b + 1),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (!user) return null;
  const count = data?.count ?? 0;
  return (
    <Link
      to="/notifications"
      aria-label="Notifications"
      className="pointer-events-auto relative flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
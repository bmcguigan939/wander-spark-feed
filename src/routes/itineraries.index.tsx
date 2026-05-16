import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { listMyItineraries } from "@/lib/itineraries.functions";
import { useAuth } from "@/lib/auth";
import { Plus, MapPin, Sparkles } from "lucide-react";

export const Route = createFileRoute("/itineraries/")({
  head: () => ({ meta: [{ title: "My Itineraries — Travidz" }] }),
  component: ItinerariesPage,
});

function ItinerariesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const listFn = useServerFn(listMyItineraries);
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-itineraries"],
    queryFn: () => listFn({ data: undefined as any }),
    enabled: !!user,
  });

  return (
    <MobileShell>
      <div className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Itineraries</h1>
          <Link to="/itineraries/new" className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> New
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">AI-built travel plans, ready to tweak.</p>

        {isLoading && <p className="mt-10 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && data?.items.length === 0 && (
          <Link to="/itineraries/new" className="mt-10 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card py-10 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-sm font-semibold">Build your first itinerary</span>
            <span className="text-xs text-muted-foreground">Tell AI a destination, get a day-by-day plan.</span>
          </Link>
        )}
        <div className="mt-5 space-y-3">
          {data?.items.map((it) => (
            <Link
              key={it.id}
              to="/itineraries/$id"
              params={{ id: it.id }}
              className="block rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <MapPin className="h-3 w-3" /> {it.destination} · {it.days} days{it.budget_tag ? ` · ${it.budget_tag}` : ""}
              </div>
              <div className="mt-1 text-base font-semibold">{it.title}</div>
              {it.summary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{it.summary}</p>}
            </Link>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}
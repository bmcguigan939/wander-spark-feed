import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { MobileShell } from "@/components/layout/BottomNav";
import { generateItinerary } from "@/lib/itineraries.functions";
import { useAuth } from "@/lib/auth";
import { Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/itineraries/new")({
  head: () => ({ meta: [{ title: "New Itinerary — Travidz" }] }),
  validateSearch: (search: Record<string, unknown>) =>
    z.object({ destination: z.string().min(1).max(120).optional() }).parse(search),
  component: NewItineraryPage,
});

const INTERESTS = [
  "food", "hiking", "beaches", "nightlife", "culture", "museums",
  "shopping", "nature", "adventure", "wellness",
];

function NewItineraryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const genFn = useServerFn(generateItinerary);
  const { destination: destParam } = Route.useSearch();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const [destination, setDestination] = useState(destParam ?? "");
  const [days, setDays] = useState(5);
  const [budget, setBudget] = useState<"budget" | "mid-range" | "luxury">("mid-range");
  const [interests, setInterests] = useState<string[]>([]);

  const m = useMutation({
    mutationFn: () => genFn({ data: { destination: destination.trim(), days, budget_tag: budget, interests } }),
    onSuccess: (r) => navigate({ to: "/itineraries/$id", params: { id: r.id } }),
    onError: (e: any) => toast(e?.message ?? "Could not build itinerary"),
  });

  function toggle(tag: string) {
    setInterests((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  return (
    <MobileShell>
      <div className="px-5 pt-6">
        <button onClick={() => navigate({ to: "/itineraries" })} className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-2xl font-bold">Plan a trip</h1>
        <p className="mt-1 text-sm text-muted-foreground">AI builds a day-by-day plan in seconds.</p>

        <form onSubmit={(e) => { e.preventDefault(); if (destination.trim()) m.mutate(); }} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Destination</span>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Lisbon, Bali, Tokyo"
              required
              maxLength={120}
              className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
            />
          </label>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>Days</span><span className="text-foreground">{days}</span>
            </div>
            <input type="range" min={1} max={14} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full accent-primary" />
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Budget</span>
            <div className="flex gap-2">
              {(["budget", "mid-range", "luxury"] as const).map((b) => (
                <button key={b} type="button" onClick={() => setBudget(b)}
                  className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold capitalize ${budget === b ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground"}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Interests</span>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((t) => {
                const on = interests.includes(t);
                return (
                  <button key={t} type="button" onClick={() => toggle(t)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${on ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground"}`}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            disabled={m.isPending || !destination.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" /> {m.isPending ? "Building plan…" : "Generate itinerary"}
          </button>
        </form>
      </div>
    </MobileShell>
  );
}
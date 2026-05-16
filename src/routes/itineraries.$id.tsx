import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { getItinerary, deleteItinerary } from "@/lib/itineraries.functions";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/itineraries/$id")({
  head: () => ({ meta: [{ title: "Itinerary — Travidz" }] }),
  component: ItineraryDetailPage,
});

type Day = {
  day: number;
  title: string;
  summary?: string;
  morning?: string;
  afternoon?: string;
  evening?: string;
  tips?: string[];
};

function ItineraryDetailPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getItinerary);
  const delFn = useServerFn(deleteItinerary);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["itinerary", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: !!user,
  });

  const delM = useMutation({
    mutationFn: () => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-itineraries"] }); navigate({ to: "/itineraries" }); toast("Deleted"); },
    onError: (e: any) => toast(e?.message ?? "Could not delete"),
  });

  if (isLoading || !data) return <MobileShell><div className="px-5 pt-10 text-sm text-muted-foreground">Loading…</div></MobileShell>;
  const it = data.itinerary;
  const days = (it.plan as Day[]) ?? [];

  return (
    <MobileShell>
      <div className="px-5 pt-6 pb-10">
        <button onClick={() => navigate({ to: "/itineraries" })} className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              <MapPin className="h-3 w-3" /> {it.destination} · {it.days} days{it.budget_tag ? ` · ${it.budget_tag}` : ""}
            </div>
            <h1 className="mt-1 text-2xl font-bold">{it.title}</h1>
          </div>
          <button
            onClick={() => { if (window.confirm("Delete this itinerary?")) delM.mutate(); }}
            className="rounded-full border border-destructive/40 bg-destructive/5 p-2 text-destructive"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {it.summary && <p className="mt-3 text-sm text-muted-foreground">{it.summary}</p>}

        <div className="mt-6 space-y-4">
          {days.map((d) => (
            <div key={d.day} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-baseline gap-2">
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">Day {d.day}</span>
                <h2 className="text-base font-semibold">{d.title}</h2>
              </div>
              {d.summary && <p className="mt-2 text-sm text-muted-foreground">{d.summary}</p>}
              <dl className="mt-3 space-y-2 text-sm">
                {d.morning && <Slot label="Morning" body={d.morning} />}
                {d.afternoon && <Slot label="Afternoon" body={d.afternoon} />}
                {d.evening && <Slot label="Evening" body={d.evening} />}
              </dl>
              {d.tips && d.tips.length > 0 && (
                <ul className="mt-3 space-y-1 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                  {d.tips.map((t, i) => <li key={i}>• {t}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}

function Slot({ label, body }: { label: string; body: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="flex-1">{body}</dd>
    </div>
  );
}
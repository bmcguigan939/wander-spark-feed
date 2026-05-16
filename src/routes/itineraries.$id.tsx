import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { getItinerary, deleteItinerary } from "@/lib/itineraries.functions";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, MapPin, Trash2, ExternalLink, Play, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/itineraries/$id")({
  head: () => ({ meta: [{ title: "Itinerary — Travidz" }] }),
  component: ItineraryDetailPage,
});

type Suggestion = {
  key: string;
  kind: string;
  title: string;
  query: string;
  tags?: string[];
  deal_matches?: Array<{
    id: string;
    title: string;
    image_url: string | null;
    price_cents: number | null;
    currency: string | null;
    affiliate_network: string | null;
  }>;
  video_matches?: Array<{
    id: string;
    title: string;
    thumbnail_url: string | null;
    username: string | null;
  }>;
};

type Day = {
  day: number;
  title: string;
  summary?: string;
  morning?: string;
  afternoon?: string;
  evening?: string;
  tips?: string[];
  suggestions?: Suggestion[];
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
              {d.suggestions && d.suggestions.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Book & watch</h3>
                  {d.suggestions.map((s) => (
                    <SuggestionCard key={s.key} s={s} />
                  ))}
                </div>
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

function SuggestionCard({ s }: { s: Suggestion }) {
  const hasDeal = (s.deal_matches?.length ?? 0) > 0;
  const hasVideo = (s.video_matches?.length ?? 0) > 0;
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-primary/80">{s.kind}</div>
          <div className="mt-0.5 text-sm font-semibold">{s.title}</div>
        </div>
      </div>

      {hasDeal ? (
        <div className="mt-2 space-y-2">
          {s.deal_matches!.map((d) => (
            <a
              key={d.id}
              href={`/api/public/d/${d.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-2 hover:border-primary/50"
            >
              {d.image_url ? (
                <img src={d.image_url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{d.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {d.price_cents != null ? `${d.currency ?? "USD"} ${(d.price_cents / 100).toFixed(0)}` : "View deal"}
                  {d.affiliate_network ? ` · ${d.affiliate_network}` : ""}
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>
      ) : (
        <Link
          to="/search"
          search={{ q: s.query }}
          className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <Search className="h-3 w-3" /> Search bookings
        </Link>
      )}

      {hasVideo && (
        <div className="mt-2 space-y-1.5">
          {s.video_matches!.map((v) => (
            <Link
              key={v.id}
              to="/u/$username"
              params={{ username: v.username ?? "" }}
              className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5 text-xs hover:bg-muted/60"
            >
              <Play className="h-3 w-3 fill-current text-primary" />
              <span className="truncate">
                {v.username ? <span className="text-muted-foreground">@{v.username} · </span> : null}
                {v.title}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
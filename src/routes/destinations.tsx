import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@/components/layout/BottomNav";
import { listDestinations } from "@/lib/destinations.functions";
import { Globe2, MapPin } from "lucide-react";

export const Route = createFileRoute("/destinations")({
  head: () => ({
    meta: [
      { title: "Destinations — Travidz" },
      { name: "description", content: "Browse travel videos by country and city." },
    ],
  }),
  component: DestinationsPage,
});

function DestinationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["destinations"],
    queryFn: () => listDestinations(),
  });
  const countries = data?.countries ?? [];

  return (
    <MobileShell>
      <div className="px-4 pt-6">
        <div className="mb-5 flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Destinations</h1>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && countries.length === 0 && (
          <p className="text-sm text-muted-foreground">No tagged destinations yet. Upload a video to get started.</p>
        )}
        <ul className="grid grid-cols-2 gap-3">
          {countries.map((c) => (
            <li key={c.country}>
              <Link
                to="/destinations/$country"
                params={{ country: c.country }}
                className="group block overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="relative aspect-[4/5] w-full bg-muted">
                  {c.cover ? (
                    <img src={c.cover} alt={c.country} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <MapPin className="h-6 w-6" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
                    <div className="text-sm font-semibold">{c.country}</div>
                    <div className="text-[11px] text-white/75">
                      {c.videoCount} video{c.videoCount === 1 ? "" : "s"}
                      {c.cityCount > 0 && ` · ${c.cityCount} cit${c.cityCount === 1 ? "y" : "ies"}`}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MobileShell>
  );
}
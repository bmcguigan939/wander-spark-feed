import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@/components/layout/BottomNav";
import { getDestination } from "@/lib/destinations.functions";
import { ArrowLeft, MapPin, Heart } from "lucide-react";

export const Route = createFileRoute("/destinations/$country/")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.country} travel videos — Travidz` },
      { name: "description", content: `Discover ${params.country} through short travel videos from creators on Travidz.` },
    ],
  }),
  component: CountryPage,
});

function CountryPage() {
  const { country } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["destination", country],
    queryFn: () => getDestination({ data: { country } }),
  });
  const videos = data?.videos ?? [];
  const cities = data?.cities ?? [];

  return (
    <MobileShell>
      <div className="px-4 pt-6">
        <Link to="/destinations" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> All destinations
        </Link>
        <h1 className="text-2xl font-semibold">{country}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{videos.length} video{videos.length === 1 ? "" : "s"}</p>

        {cities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {cities.map((c) => (
              <Link
                key={c.city}
                to="/destinations/$country/$city"
                params={{ country, city: c.city }}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs"
              >
                <MapPin className="h-3 w-3" /> {c.city} <span className="text-muted-foreground">({c.count})</span>
              </Link>
            ))}
          </div>
        )}

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && videos.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">No videos here yet.</p>
        )}

        <ul className="mt-5 grid grid-cols-2 gap-3">
          {videos.map((v: any) => (
            <li key={v.id}>
              <Link to="/" search={{ v: v.id } as any} className="group block overflow-hidden rounded-2xl bg-card">
                <div className="relative aspect-[9/14] w-full bg-muted">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 text-white">
                    <div className="line-clamp-2 text-xs font-medium">{v.title}</div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-white/75">
                      <Heart className="h-3 w-3" /> {v.like_count}
                      {v.city && <span className="ml-1">· {v.city}</span>}
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
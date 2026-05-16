import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@/components/layout/BottomNav";
import { getDestination } from "@/lib/destinations.functions";
import { listDeals } from "@/lib/deals.functions";
import { ArrowLeft, MapPin, Heart, Tag } from "lucide-react";
import { CinematicHeader } from "@/components/ui/cinematic";

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
  const { data: dealsData } = useQuery({
    queryKey: ["deals", "country", country],
    queryFn: () => listDeals({ data: { country } }),
  });
  const videos = data?.videos ?? [];
  const cities = data?.cities ?? [];
  const deals = dealsData?.deals ?? [];
  const cover = videos[0]?.thumbnail_url ?? null;

  return (
    <MobileShell>
      <CinematicHeader
        height="h-56"
        image={cover}
        eyebrow="Destination"
        title={country}
        subtitle={`${videos.length} video${videos.length === 1 ? "" : "s"}${cities.length ? ` · ${cities.length} cit${cities.length === 1 ? "y" : "ies"}` : ""}`}
      />
      <div className="px-4 pt-5 pb-8">
        <Link to="/destinations" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> All destinations
        </Link>

        {cities.length > 0 && (
          <div className="flex flex-wrap gap-2">
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

        {deals.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Tag className="h-4 w-4 text-primary" /> Deals in {country}
            </div>
            <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {deals.slice(0, 8).map((d: any) => (
                <li key={d.id} className="w-44 flex-shrink-0">
                  <Link
                    to="/deals/$id"
                    params={{ id: d.id }}
                    className="block overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <div className="aspect-video w-full bg-muted">
                      {d.image_url && <img src={d.image_url} alt={d.title} className="h-full w-full object-cover" />}
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-2 text-xs font-medium">{d.title}</p>
                      {d.discount_label && (
                        <span className="mt-1 inline-block rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {d.discount_label}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
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
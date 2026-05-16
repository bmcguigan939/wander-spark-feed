import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@/components/layout/BottomNav";
import { listDeals } from "@/lib/deals.functions";
import { Tag, MapPin } from "lucide-react";

export const Route = createFileRoute("/deals/")({
  head: () => ({
    meta: [
      { title: "Travel Deals — Travidz" },
      { name: "description", content: "Curated travel deals from creators and businesses around the world." },
      { property: "og:title", content: "Travel Deals — Travidz" },
      { property: "og:description", content: "Curated travel deals from creators and businesses around the world." },
    ],
  }),
  component: DealsIndex,
});

function DealsIndex() {
  const { data, isLoading } = useQuery({
    queryKey: ["deals", "all"],
    queryFn: () => listDeals({ data: {} }),
  });
  const deals = data?.deals ?? [];

  return (
    <MobileShell>
      <div className="px-4 pt-6">
        <div className="mb-5 flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Deals</h1>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && deals.length === 0 && (
          <p className="text-sm text-muted-foreground">No active deals yet.</p>
        )}
        <ul className="space-y-3">
          {deals.map((d: any) => (
            <li key={d.id}>
              <Link
                to="/deals/$id"
                params={{ id: d.id }}
                className="flex gap-3 overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="h-24 w-24 flex-shrink-0 bg-muted">
                  {d.image_url ? (
                    <img src={d.image_url} alt={d.title} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 py-2 pr-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{[d.city, d.country].filter(Boolean).join(", ") || d.destination || "Anywhere"}</span>
                  </div>
                  <h2 className="mt-0.5 line-clamp-2 text-sm font-semibold">{d.title}</h2>
                  {d.discount_label && (
                    <span className="mt-1 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {d.discount_label}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MobileShell>
  );
}
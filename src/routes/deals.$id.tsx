import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell } from "@/components/layout/BottomNav";
import { getDeal, logDealClick } from "@/lib/deals.functions";
import { useAuth } from "@/lib/auth";
import { MapPin, ExternalLink, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/deals/$id")({
  component: DealDetail,
});

function DealDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const fetchDeal = useServerFn(getDeal);
  const logClick = useServerFn(logDealClick);

  const { data, isLoading, error } = useQuery({
    queryKey: ["deal", id],
    queryFn: () => fetchDeal({ data: { id } }),
    retry: false,
  });
  const deal = data?.deal as any;

  const onView = async () => {
    try {
      await logClick({ data: { dealId: id, userId: user?.id } });
    } catch {}
    if (deal?.url) window.open(deal.url, "_blank", "noopener,noreferrer");
  };

  return (
    <MobileShell>
      <div className="px-4 pt-4">
        <Link to="/deals" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> All deals
        </Link>
        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="mt-6 text-sm text-destructive">Deal not found.</p>}
        {deal && (
          <div className="mt-4">
            {deal.image_url && (
              <img src={deal.image_url} alt={deal.title} className="aspect-video w-full rounded-2xl object-cover" />
            )}
            <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{[deal.city, deal.country].filter(Boolean).join(", ") || deal.destination || "Anywhere"}</span>
            </div>
            <h1 className="mt-1 text-xl font-semibold">{deal.title}</h1>
            {deal.discount_label && (
              <span className="mt-2 inline-block rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                {deal.discount_label}
              </span>
            )}
            {deal.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{deal.description}</p>
            )}
            <button
              onClick={onView}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30"
            >
              <ExternalLink className="h-4 w-4" /> View deal
            </button>
            {deal.business && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                by{" "}
                <Link to="/u/$username" params={{ username: deal.business.username }} className="underline">
                  @{deal.business.username}
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listMyCompetitorUrls,
  upsertMyCompetitorUrl,
  deleteMyCompetitorUrl,
} from "@/lib/business-competitor-urls.functions";

const NETWORK_LABEL: Record<string, string> = {
  "booking.com": "Booking.com",
  expedia: "Expedia",
  agoda: "Agoda",
  getyourguide: "GetYourGuide",
  viator: "Viator",
  airbnb: "Airbnb",
  vrbo: "Vrbo",
  tripadvisor: "Tripadvisor",
  klook: "Klook",
  tiqets: "Tiqets",
  musement: "Musement",
};

/**
 * Pinned per-business OTA listing URLs. Optional — but when present
 * the price-match scanner uses the exact listing instead of guessing
 * via search, which produces a like-for-like comparison.
 */
export function CompetitorUrlsEditor() {
  const listFn = useServerFn(listMyCompetitorUrls);
  const upsertFn = useServerFn(upsertMyCompetitorUrl);
  const deleteFn = useServerFn(deleteMyCompetitorUrl);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-competitor-urls"],
    queryFn: () => listFn(),
  });

  const upsert = useMutation({
    mutationFn: (v: { network: string; url: string }) =>
      upsertFn({ data: v as any }),
    onSuccess: () => {
      toast.success("Listing saved");
      setDraftNet("");
      setDraftUrl("");
      qc.invalidateQueries({ queryKey: ["my-competitor-urls"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't save"),
  });

  const del = useMutation({
    mutationFn: (network: string) => deleteFn({ data: { network } as any }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["my-competitor-urls"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't remove"),
  });

  const [draftNet, setDraftNet] = useState<string>("");
  const [draftUrl, setDraftUrl] = useState("");

  const networks = (data?.networks ?? []) as string[];
  const existing = (data?.urls ?? []) as Array<{
    id: string;
    network: string;
    url: string;
    verified_at: string | null;
    last_status: string | null;
    last_error: string | null;
  }>;
  const usedNetworks = new Set(existing.map((u) => u.network));
  const availableNetworks = networks.filter((n) => !usedNetworks.has(n));

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <div className="flex items-start gap-2">
          <Link2 className="h-4 w-4 text-primary mt-0.5" />
          <div className="text-xs text-muted-foreground">
            Paste the exact URL of your listing on each OTA you're on. The
            price-match scanner will compare against those listings directly
            instead of guessing. Optional, but recommended — it removes false
            positives caused by similarly-named properties.
          </div>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      <ul className="space-y-2">
        {existing.map((row) => (
          <li key={row.id} className="rounded-xl border bg-card p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{NETWORK_LABEL[row.network] ?? row.network}</div>
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 text-xs underline break-all"
                >
                  {row.url} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {row.verified_at
                    ? `Verified ${new Date(row.verified_at).toLocaleDateString()}`
                    : row.last_status === "broken" || row.last_status === "wrong_domain"
                      ? `Last check: ${row.last_status.replace("_", " ")}`
                      : "Not yet verified"}
                  {row.last_error ? ` · ${row.last_error}` : ""}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => del.mutate(row.network)}
                disabled={del.isPending}
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {availableNetworks.length > 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Add another listing
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableNetworks.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDraftNet(n)}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  draftNet === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background"
                }`}
              >
                {NETWORK_LABEL[n] ?? n}
              </button>
            ))}
          </div>
          {draftNet && (
            <div className="space-y-2 pt-1">
              <Input
                type="url"
                placeholder={`Paste your ${NETWORK_LABEL[draftNet] ?? draftNet} listing URL`}
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                inputMode="url"
                autoComplete="off"
              />
              <Button
                size="sm"
                onClick={() =>
                  upsert.mutate({ network: draftNet, url: draftUrl.trim() })
                }
                disabled={upsert.isPending || draftUrl.trim().length < 8}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Save listing
              </Button>
            </div>
          )}
        </div>
      ) : (
        existing.length > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            All supported networks added.
          </p>
        )
      )}
    </div>
  );
}

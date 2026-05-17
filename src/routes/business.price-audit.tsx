import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth";
import { listParityChecksForBusiness, disputeMatchCode, setParityExempt } from "@/lib/price-match.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, AlertTriangle, ChevronLeft, ExternalLink, ShieldOff } from "lucide-react";

export const Route = createFileRoute("/business/price-audit")({
  head: () => ({ meta: [{ title: "Price-match audit — Travidz" }] }),
  component: PriceAuditPage,
});

function fmt(cents: number | null, currency: string = "GBP") {
  if (cents == null) return "—";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function PriceAuditPage() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const fetchFn = useServerFn(listParityChecksForBusiness);
  const disputeFn = useServerFn(disputeMatchCode);
  const exemptFn = useServerFn(setParityExempt);
  const qc = useQueryClient();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["price-audit"],
    queryFn: () => fetchFn(),
    enabled: !!user && isBusiness,
  });

  const [tab, setTab] = useState<"checks" | "codes" | "listings">("codes");
  const [disputing, setDisputing] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [exemptingId, setExemptingId] = useState<string | null>(null);
  const [exemptReason, setExemptReason] = useState("");

  const dispute = useMutation({
    mutationFn: (code: string) => disputeFn({ data: { code, reason } }),
    onSuccess: () => {
      toast.success("Dispute filed — Travidz will review");
      setDisputing(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["price-audit"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to file dispute"),
  });

  const exempt = useMutation({
    mutationFn: (v: { linkId: string; exempt: boolean; reason?: string }) =>
      exemptFn({ data: v }),
    onSuccess: () => {
      toast.success("Listing updated");
      setExemptingId(null);
      setExemptReason("");
      qc.invalidateQueries({ queryKey: ["price-audit"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (!user || !isBusiness) return null;

  const linksById = new Map((data?.links ?? []).map((l: any) => [l.id, l.label]));

  return (
    <MobileShell>
      <div className="p-4 space-y-4">
        <Link to="/business" className="inline-flex items-center text-xs text-muted-foreground">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Price-match audit</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Every time a traveller clicks through to one of your listings, Travidz checks
          competitor prices and records the result here. You can dispute any match you
          believe is unfair.
        </p>

        <div className="inline-flex rounded-full border bg-card p-1 text-xs font-medium">
          <button
            onClick={() => setTab("codes")}
            className={`px-4 py-1.5 rounded-full ${tab === "codes" ? "bg-primary text-primary-foreground" : ""}`}
          >
            Match codes ({data?.codes?.length ?? 0})
          </button>
          <button
            onClick={() => setTab("checks")}
            className={`px-4 py-1.5 rounded-full ${tab === "checks" ? "bg-primary text-primary-foreground" : ""}`}
          >
            All checks ({data?.checks?.length ?? 0})
          </button>
          <button
            onClick={() => setTab("listings")}
            className={`px-4 py-1.5 rounded-full ${tab === "listings" ? "bg-primary text-primary-foreground" : ""}`}
          >
            Listings ({data?.links?.length ?? 0})
          </button>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {tab === "codes" && (
          <div className="space-y-3">
            {(data?.codes ?? []).length === 0 && !isLoading && (
              <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground text-center">
                No price matches issued yet.
              </div>
            )}
            {(data?.codes ?? []).map((c: any) => (
              <div key={c.code} className="rounded-xl border bg-card p-4 space-y-2 text-sm">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-mono text-xs">{c.code}</div>
                    <div className="text-xs text-muted-foreground">
                      {linksById.get(c.link_id) ?? "Listing"} · {new Date(c.issued_at).toLocaleString()}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      c.status === "disputed"
                        ? "bg-destructive/10 text-destructive"
                        : c.status === "redeemed"
                          ? "bg-green-100 text-green-700"
                          : "bg-muted"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Original</div>
                    <div>{fmt(c.original_price_cents, c.currency)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Matched to</div>
                    <div className="font-semibold">{fmt(c.matched_price_cents, c.currency)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Source</div>
                    <a
                      href={c.competitor_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline capitalize"
                    >
                      {c.competitor_network} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {c.evidence_hash && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground">Evidence hash (SHA-256)</div>
                      <div className="font-mono text-[10px] break-all">{c.evidence_hash}</div>
                    </div>
                  )}
                  {c.evidence_url && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground mb-1">Screenshot evidence</div>
                      <a href={c.evidence_url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border">
                        <img
                          src={c.evidence_url}
                          alt={`${c.competitor_network} price screenshot`}
                          loading="lazy"
                          className="w-full h-32 object-cover object-top"
                        />
                      </a>
                    </div>
                  )}
                </div>
                {c.status !== "disputed" && (
                  <div className="pt-2">
                    {disputing === c.code ? (
                      <div className="space-y-2">
                        <Textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Why is this match unfair? (e.g. different dates, room type, member-only price)"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => dispute.mutate(c.code)}
                            disabled={dispute.isPending || reason.length < 5}
                          >
                            {dispute.isPending ? "Filing…" : "Submit dispute"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDisputing(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDisputing(c.code)}
                      >
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Dispute
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "checks" && (
          <div className="space-y-2 text-xs">
            {(data?.checks ?? []).length === 0 && !isLoading && (
              <div className="rounded-xl border bg-card p-6 text-muted-foreground text-center">
                No checks have run yet.
              </div>
            )}
            {(data?.checks ?? []).map((c: any) => (
              <div key={c.id} className="rounded-lg border bg-card p-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {new Date(c.ran_at).toLocaleString()}
                  </span>
                  <span
                    className={`capitalize ${
                      c.action === "match_issued"
                        ? "text-primary font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {c.action.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-muted-foreground">
                    {(c.providers_checked ?? []).length > 0
                      ? `Checked: ${(c.providers_checked as string[]).join(", ")}`
                      : "No providers checked"}
                  </span>
                </div>
                {c.cheapest_network && (
                  <div className="text-muted-foreground">
                    Cheapest: {c.cheapest_network} @ {fmt(c.cheapest_price_cents)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "listings" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Mark a listing parity-exempt only when you have a contractual reason — e.g. a
              members-only rate, a packaged inclusion, or a third-party OTA price that
              isn't comparable. A written reason is required and will be visible to Travidz
              support during disputes.
            </p>
            {(data?.links ?? []).length === 0 && !isLoading && (
              <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground text-center">
                No tracked listings yet.
              </div>
            )}
            {(data?.links ?? []).map((l: any) => (
              <div key={l.id} className="rounded-xl border bg-card p-3 text-sm space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-semibold">{l.label}</div>
                    {l.parity_exempt ? (
                      <div className="mt-1 text-xs text-amber-600">
                        Parity-exempt · {l.parity_exempt_reason || "no reason"}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-muted-foreground">Active — price-match checks run on every click</div>
                    )}
                  </div>
                  {l.parity_exempt ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exempt.mutate({ linkId: l.id, exempt: false })}
                      disabled={exempt.isPending}
                    >
                      Re-enable
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setExemptingId(l.id);
                        setExemptReason("");
                      }}
                    >
                      <ShieldOff className="h-3.5 w-3.5 mr-1" /> Mark exempt
                    </Button>
                  )}
                </div>
                {exemptingId === l.id && !l.parity_exempt && (
                  <div className="space-y-2 pt-1">
                    <Textarea
                      rows={2}
                      placeholder="Reason this listing should be exempt (required, min 5 chars)"
                      value={exemptReason}
                      onChange={(e) => setExemptReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          exempt.mutate({ linkId: l.id, exempt: true, reason: exemptReason })
                        }
                        disabled={exempt.isPending || exemptReason.trim().length < 5}
                      >
                        Confirm exempt
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setExemptingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
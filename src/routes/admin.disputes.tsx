import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listDisputedMatchCodes, resolveMatchDispute } from "@/lib/price-match.functions";

export const Route = createFileRoute("/admin/disputes")({
  head: () => ({ meta: [{ title: "Price-match disputes — Admin" }] }),
  component: AdminDisputes,
});

function fmt(cents: number | null | undefined, currency = "GBP") {
  if (cents == null) return "—";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function AdminDisputes() {
  const fetchFn = useServerFn(listDisputedMatchCodes);
  const resolveFn = useServerFn(resolveMatchDispute);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-disputes"], queryFn: () => fetchFn() });
  const [notes, setNotes] = useState<Record<string, string>>({});

  const resolve = useMutation({
    mutationFn: (v: { code: string; decision: "uphold_match" | "uphold_business" }) =>
      resolveFn({ data: { code: v.code, decision: v.decision, note: notes[v.code] || undefined } }),
    onSuccess: () => {
      toast.success("Dispute resolved");
      qc.invalidateQueries({ queryKey: ["admin-disputes"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="px-4 py-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        Open disputes from businesses contesting a Travidz price match. Uphold the match if
        the evidence is fair; uphold the business if the comparison was invalid (different
        dates, room type, package, member-only rate).
      </p>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && (data?.codes?.length ?? 0) === 0 && (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          No open disputes.
        </div>
      )}
      {(data?.codes ?? []).map((c: any) => (
        <div key={c.code} className="rounded-xl border bg-card p-3 space-y-2 text-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-mono text-xs">{c.code}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(c.issued_at).toLocaleString()} · {c.competitor_network}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {fmt(c.original_price_cents, c.currency)} → <span className="font-semibold text-foreground">{fmt(c.matched_price_cents, c.currency)}</span>
            </div>
          </div>
          <div className="rounded-md bg-muted/40 p-2 text-xs">
            <div className="text-muted-foreground mb-1">Business reason</div>
            {c.dispute_reason || <span className="italic">No reason supplied</span>}
          </div>
          {c.evidence_url && (
            <a href={c.evidence_url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border">
              <img src={c.evidence_url} alt="evidence" loading="lazy" className="w-full h-40 object-cover object-top" />
            </a>
          )}
          <Textarea
            rows={2}
            placeholder="Resolution notes (optional, visible to business)"
            value={notes[c.code] ?? ""}
            onChange={(e) => setNotes((n) => ({ ...n, [c.code]: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => resolve.mutate({ code: c.code, decision: "uphold_match" })} disabled={resolve.isPending}>
              Uphold match
            </Button>
            <Button size="sm" variant="outline" onClick={() => resolve.mutate({ code: c.code, decision: "uphold_business" })} disabled={resolve.isPending}>
              Uphold business
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
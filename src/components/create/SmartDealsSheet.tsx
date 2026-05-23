import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Sparkles, X, Tag, Loader2, ExternalLink, Send, Search, Building2, ArrowLeft, RefreshCw, Copy, Mail } from "lucide-react";
import { suggestDealsForVideo, attachDealsBulk } from "@/lib/video-deals.functions";
import {
  listSuggestionsForVideo,
  dismissSuggestion,
  markSuggestionConverted,
  rerunBusinessExtraction,
  type BusinessSuggestion,
} from "@/lib/business-suggestions.functions";
import { createBusinessInvite } from "@/lib/business-invites.functions";
import { draftInviteEmail } from "@/lib/outreach.functions";
import { COMMISSION } from "@/lib/commission";
import { toast } from "sonner";

function formatPrice(cents: number | null, currency: string | null): string {
  if (!cents) return "";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency ?? ""}`;
  }
}

export function SmartDealsSheet({
  open,
  onClose,
  videoId,
}: {
  open: boolean;
  onClose: () => void;
  videoId: string | null;
}) {
  const suggestFn = useServerFn(suggestDealsForVideo);
  const attachFn = useServerFn(attachDealsBulk);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["video-deal-suggestions", videoId],
    queryFn: () => suggestFn({ data: { videoId: videoId! } }),
    enabled: open && !!videoId,
    staleTime: 60_000,
  });

  // Reset selection when sheet opens for a different video.
  useEffect(() => {
    setSelected(new Set());
  }, [videoId, open]);

  // Default-select top 3 once loaded (opt-out boosts attach rate).
  useEffect(() => {
    if (!data?.deals || data.deals.length === 0) return;
    setSelected((prev) => {
      if (prev.size > 0) return prev;
      return new Set(data.deals.slice(0, 3).map((d) => d.id));
    });
  }, [data?.deals]);

  const attachM = useMutation({
    mutationFn: () =>
      attachFn({ data: { videoId: videoId!, dealIds: Array.from(selected) } }),
    onSuccess: (r) => {
      toast(`Attached ${r.count} deal${r.count === 1 ? "" : "s"}`);
      onClose();
    },
    onError: (e: any) => toast(e?.message ?? "Failed to attach"),
  });

  if (!open) return null;

  const hasDeals = (data?.deals?.length ?? 0) > 0;
  const inOutreach = !isLoading && !!data && !hasDeals;

  const handleClose = () => {
    if (inOutreach) {
      toast("You can attach deals later from Studio → Videos.");
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm pb-[calc(env(safe-area-inset-bottom)+72px)] sm:items-center sm:pb-0"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md max-h-[90dvh] flex-col rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl"
      >
        <div className="shrink-0 px-5 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Smart deals for this video</h2>
            </div>
            <button onClick={handleClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            AI found bookable activities matching your destination. Viewers can book in one tap — you earn commission on every booking.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2">
          {isLoading && (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Finding deals…
            </div>
          )}
          {isError && (
            <p className="mt-6 text-sm text-destructive">Couldn't load suggestions. You can skip and add deals later from your studio.</p>
          )}
          {data?.deals && data.deals.length === 0 && (
            <BusinessOutreachPanel videoId={videoId!} onDone={onClose} />
          )}

          {hasDeals && (
          <ul className="mt-4 space-y-2">
            {data!.deals.map((d) => {
            const checked = selected.has(d.id);
            return (
              <li key={d.id}>
                <label className={`flex cursor-pointer gap-3 rounded-2xl border p-3 ${checked ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = new Set(selected);
                      if (checked) next.delete(d.id); else next.add(d.id);
                      setSelected(next);
                    }}
                    className="mt-1"
                  />
                  {d.image_url ? (
                    <img src={d.image_url} alt="" className="h-14 w-14 flex-shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Tag className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-semibold">{d.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      {[d.city, d.country].filter(Boolean).join(", ") || "—"}
                      {d.affiliate_network && <span className="rounded-full bg-muted px-1.5 py-0.5">{d.affiliate_network}</span>}
                      {d.price_cents != null && <span className="font-semibold text-foreground">{formatPrice(d.price_cents, d.currency)}</span>}
                    </div>
                    <a
                      href={d.image_url ? undefined : undefined}
                      onClick={(e) => e.preventDefault()}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                    >
                      <ExternalLink className="h-3 w-3" /> Supplier link
                    </a>
                  </div>
                </label>
              </li>
            );
          })}
          </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-card px-5 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          {inOutreach ? (
            <button
              onClick={handleClose}
              className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Close
            </button>
          ) : hasDeals ? (
            <>
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold text-muted-foreground"
                >
                  Skip
                </button>
                <button
                  disabled={selected.size === 0 || attachM.isPending}
                  onClick={() => attachM.mutate()}
                  className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {attachM.isPending ? "Attaching…" : `Attach ${selected.size || ""}`.trim()}
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                Travidz earns a commission when viewers book — you pay nothing extra.
              </p>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="w-full rounded-full border border-border py-2.5 text-sm font-semibold text-muted-foreground"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BusinessOutreachPanel({ videoId, onDone }: { videoId: string; onDone: () => void }) {
  const listFn = useServerFn(listSuggestionsForVideo);
  const rescanFn = useServerFn(rerunBusinessExtraction);
  const dismissFn = useServerFn(dismissSuggestion);
  const [openFor, setOpenFor] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["video-business-suggestions", videoId],
    queryFn: () => listFn({ data: { videoId } }),
    refetchInterval: (query) => ((query.state.data?.length ?? 0) === 0 ? 5000 : false),
  });

  const rescanM = useMutation({
    mutationFn: () => rescanFn({ data: { videoId } }),
    onSuccess: () => {
      toast("Re-scanning the video…");
      q.refetch();
    },
    onError: (e: any) => toast(e?.message ?? "Couldn't re-scan"),
  });

  const dismissM = useMutation({
    mutationFn: (id: string) => dismissFn({ data: { id } }),
    onSuccess: () => q.refetch(),
  });

  const suggestions = q.data ?? [];

  return (
    <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-2">
        <Search className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">No bookable deals yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Travidz AI is finding this location's website, email and phone so you can invite them directly to collaborate.
          </p>
        </div>
      </div>

      {q.isLoading && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning video for business details…
        </div>
      )}

      {!q.isLoading && suggestions.length === 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-background/40 p-3">
          <p className="text-xs text-muted-foreground">
            {rescanM.isPending
              ? "Re-scanning the video… this can take ~30s."
              : "Still looking. This usually takes under a minute after upload."}
          </p>
          <button
            onClick={() => rescanM.mutate()}
            disabled={rescanM.isPending}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
          >
            {rescanM.isPending ? "Re-scanning…" : "Re-scan"}
          </button>
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {suggestions.map((s) => (
          <li key={s.id}>
            {openFor === s.id ? (
              <InviteForm
                suggestion={s}
                videoId={videoId}
                onCancel={() => setOpenFor(null)}
                onSent={() => {
                  setOpenFor(null);
                  q.refetch();
                }}
              />
            ) : (
              <div className="flex gap-3 rounded-xl border border-border bg-background p-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {[s.category, [s.city, s.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "Location detected"}
                  </p>
                  {s.website_guess && (
                    <a
                      href={s.website_guess}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-0.5 inline-flex items-center gap-1 truncate text-[11px] text-primary"
                    >
                      <ExternalLink className="h-3 w-3" /> {s.website_guess.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setOpenFor(s.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                    >
                      <Send className="h-3 w-3" /> Send collaboration contract
                    </button>
                    <button
                      onClick={() => dismissM.mutate(s.id)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[10px] text-muted-foreground">
        Travidz handles the contract. You earn {COMMISSION.creatorPct}% on every booking they get from your video — they pay nothing extra.
      </p>
    </div>
  );
}

function InviteForm({
  suggestion,
  videoId,
  onCancel,
  onSent,
}: {
  suggestion: BusinessSuggestion;
  videoId: string;
  onCancel: () => void;
  onSent: () => void;
}) {
  const createFn = useServerFn(createBusinessInvite);
  const convertFn = useServerFn(markSuggestionConverted);
  const [name, setName] = useState(suggestion.name);
  const [website, setWebsite] = useState(suggestion.website_guess ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const sendM = useMutation({
    mutationFn: async () => {
      const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
      const inv = await createFn({
        data: {
          videoId,
          businessName: name.trim(),
          websiteUrl: url.trim(),
          city: suggestion.city,
          contactEmail: email.trim(),
          contactPhone: phone.trim() || null,
        },
      });
      await convertFn({ data: { id: suggestion.id, inviteId: inv.id } });
      return inv;
    },
    onSuccess: () => {
      toast("Invite sent — they'll get a contract to confirm the fee split.");
      onSent();
    },
    onError: (e: any) => toast(e?.message ?? "Couldn't send invite"),
  });

  const valid = name.trim().length > 0 && website.trim().length > 0 && /.+@.+\..+/.test(email);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) sendM.mutate();
      }}
      className="space-y-2 rounded-xl border border-primary/30 bg-background p-3"
    >
      <p className="text-xs font-semibold">Send collaboration contract</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Business name"
        className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-sm"
        maxLength={120}
      />
      <input
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        placeholder="Website (e.g. example.com)"
        className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-sm"
        maxLength={500}
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="Contact email (required)"
        className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-sm"
        maxLength={200}
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Contact phone (optional)"
        className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-sm"
        maxLength={40}
      />
      <p className="text-[10px] text-muted-foreground">
        We'll email them a Travidz contract at the set {COMMISSION.totalPct}% commission ({COMMISSION.creatorPct}% to you).
      </p>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-border bg-card py-2 text-xs font-semibold text-muted-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!valid || sendM.isPending}
          className="flex-1 rounded-full bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {sendM.isPending ? "Sending…" : "Send contract"}
        </button>
      </div>
    </form>
  );
}
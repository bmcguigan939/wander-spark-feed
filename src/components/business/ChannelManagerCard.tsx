import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CalendarSync,
  Check,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Link as LinkIcon,
} from "lucide-react";
import {
  addMyChannelFeed,
  listMyChannelFeeds,
  listMyDealIcalUrls,
  removeMyChannelFeed,
  syncMyChannelFeedNow,
} from "@/lib/business-channel-feeds.functions";

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function ChannelManagerCard() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyChannelFeeds);
  const addFn = useServerFn(addMyChannelFeed);
  const removeFn = useServerFn(removeMyChannelFeed);
  const syncFn = useServerFn(syncMyChannelFeedNow);
  const dealsFn = useServerFn(listMyDealIcalUrls);

  const feedsQ = useQuery({
    queryKey: ["business-channel-feeds"],
    queryFn: () => listFn(),
  });
  const dealsQ = useQuery({
    queryKey: ["business-deal-ical-urls"],
    queryFn: () => dealsFn(),
  });

  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const addM = useMutation({
    mutationFn: () =>
      addFn({ data: { label: label.trim() || null, feed_url: url.trim() } }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["business-channel-feeds"] });
      setLabel("");
      setUrl("");
      if (r.ok) {
        toast.success(
          `Connected · ${r.blockedCount} dates blocked across ${r.dealCount} deal${r.dealCount === 1 ? "" : "s"}`,
        );
      } else {
        toast.error(`Saved but sync failed: ${r.error ?? "unknown"}`);
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not add feed"),
  });

  const removeM = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-channel-feeds"] });
    },
  });

  const syncM = useMutation({
    mutationFn: (id: string) => syncFn({ data: { id } }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["business-channel-feeds"] });
      if (r.ok) toast.success(`Synced · ${r.blockedCount} dates blocked`);
      else toast.error(r.error ?? "Sync failed");
    },
  });

  const lastAuto = useMemo(() => {
    const feeds = feedsQ.data?.feeds ?? [];
    const times = feeds
      .map((f: any) => f.last_synced_at)
      .filter(Boolean)
      .map((t: string) => new Date(t).getTime());
    if (!times.length) return null;
    return new Date(Math.max(...times)).toISOString();
  }, [feedsQ.data]);

  async function copyOne(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  async function copyAll() {
    const deals = dealsQ.data?.deals ?? [];
    if (!deals.length) return;
    const lines = deals.map((d) => `${d.title},${d.feedUrl}`);
    await copyOne("__all", `title,url\n${lines.join("\n")}`);
  }

  return (
    <section
      id="channel-manager"
      className="mb-4 scroll-mt-20 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2">
        <CalendarSync className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Channel manager</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Connect your hotel / property management system once and we'll block
        dates across every one of your deals automatically. Sync runs every hour
        and on demand.
      </p>

      {/* Feeds we're importing */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Feeds you're importing
          </div>
          {lastAuto && (
            <span className="text-[11px] text-muted-foreground">
              Last sync: {relativeTime(lastAuto)}
            </span>
          )}
        </div>

        {feedsQ.isLoading ? (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        ) : (feedsQ.data?.feeds.length ?? 0) === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-border bg-background/40 px-3 py-3 text-[12px] text-muted-foreground">
            No feeds connected yet. Paste an iCal URL from your channel manager
            below — it'll block dates across all your deals.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {feedsQ.data!.feeds.map((f: any) => (
              <li
                key={f.id}
                className="rounded-xl border border-border bg-background px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      {f.label || "Channel manager feed"}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {f.feed_url}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                      {f.last_status === "ok" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500">
                          <Check className="h-3 w-3" /> Synced{" "}
                          {relativeTime(f.last_synced_at)}
                        </span>
                      ) : f.last_status === "error" ? (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <TriangleAlert className="h-3 w-3" />
                          {f.last_error?.slice(0, 60) ?? "Error"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Not yet synced
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        · {f.last_blocked_count ?? 0} dates · {f.deal_count}{" "}
                        deal{f.deal_count === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => syncM.mutate(f.id)}
                      disabled={syncM.isPending}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border"
                      title="Sync now"
                    >
                      {syncM.isPending && syncM.variables === f.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `Remove "${f.label || "this feed"}"? Dates it was blocking will be released.`,
                          )
                        )
                          removeM.mutate(f.id);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border text-destructive"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Add form */}
        <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
          <div className="grid gap-2">
            <input
              type="text"
              placeholder="Label (optional, e.g. SiteMinder main)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={80}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="url"
              placeholder="https://… .ics URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!url.trim() || addM.isPending}
              onClick={() => addM.mutate()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {addM.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add feed
            </button>
          </div>
        </div>
      </div>

      {/* Outbound URLs */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Outbound calendar URLs
          </div>
          {(dealsQ.data?.deals.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              {copiedKey === "__all" ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copiedKey === "__all" ? "Copied" : "Copy all as CSV"}
            </button>
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Paste these into your channel manager's "Import calendar" screen so it
          blocks dates booked through Travidz.
        </p>

        {dealsQ.isLoading ? (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        ) : (dealsQ.data?.deals.length ?? 0) === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-border bg-background/40 px-3 py-3 text-[12px] text-muted-foreground">
            No deals yet — once you publish your first deal, its outbound iCal
            URL appears here.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {dealsQ.data!.deals.map((d) => (
              <li
                key={d.dealId}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2"
              >
                <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">
                    {d.title}
                  </div>
                  <code className="block truncate text-[10px] text-muted-foreground">
                    {d.feedUrl}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => copyOne(d.dealId, d.feedUrl)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold"
                >
                  {copiedKey === d.dealId ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedKey === d.dealId ? "Copied" : "Copy"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        iCal sync is near-real-time — typically 5–30 min lag depending on each
        platform. Sync runs automatically every hour; use "Sync now" for an
        instant refresh.
      </p>
    </section>
  );
}
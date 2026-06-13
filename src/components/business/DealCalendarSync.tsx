import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import {
  addExternalCalendar,
  getDealCalendarSettings,
  removeExternalCalendar,
  syncExternalCalendarNow,
} from "@/lib/calendar.functions";

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function DealCalendarSync({ dealId }: { dealId: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getDealCalendarSettings);
  const addFn = useServerFn(addExternalCalendar);
  const removeFn = useServerFn(removeExternalCalendar);
  const syncFn = useServerFn(syncExternalCalendarNow);

  const { data, isLoading } = useQuery({
    queryKey: ["calendar-sync", dealId],
    queryFn: () => getFn({ data: { dealId } }),
  });

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const addM = useMutation({
    mutationFn: () => addFn({ data: { dealId, name: name.trim(), icsUrl: url.trim() } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["calendar-sync", dealId] });
      setName("");
      setUrl("");
      if (r.ok) toast.success(`Connected · ${r.blockedCount} dates blocked`);
      else toast.error(`Saved but sync failed: ${r.error ?? "unknown"}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not add calendar"),
  });

  const removeM = useMutation({
    mutationFn: (calendarId: string) => removeFn({ data: { dealId, calendarId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-sync", dealId] }),
  });

  const syncM = useMutation({
    mutationFn: (calendarId: string) => syncFn({ data: { dealId, calendarId } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["calendar-sync", dealId] });
      if (r.ok) toast.success(`Synced · ${r.blockedCount} dates blocked`);
      else toast.error(r.error ?? "Sync failed");
    },
  });

  async function copyFeed() {
    if (!data?.feedUrl) return;
    try {
      await navigator.clipboard.writeText(data.feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <section id="calendar" className="mt-6 scroll-mt-20 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <CalendarSync className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Calendar sync</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Keep this deal in sync with your own website, Airbnb, Booking.com, etc.
        using standard iCal feeds. Two-way: share Travidz bookings out, and
        block dates booked elsewhere.
      </p>

      {isLoading || !data ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* Outbound feed */}
          <div className="mt-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Your Travidz calendar URL
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="block flex-1 truncate rounded-lg border border-border bg-background px-2.5 py-2 text-[11px]">
                {data.feedUrl}
              </code>
              <button
                type="button"
                onClick={copyFeed}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-semibold"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Paste this in your own booking system / Airbnb / Booking.com under
              "Import calendar" so they block dates Travidz has booked.
            </p>
          </div>

          {/* External calendars */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                External calendars
              </div>
              <span className="text-[11px] text-muted-foreground">
                {data.blockedCount} dates blocked
              </span>
            </div>

            {(data.calendars?.length ?? 0) === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-border bg-background/40 px-3 py-3 text-[12px] text-muted-foreground">
                No external calendars yet. Add your website's iCal export URL,
                or one from Airbnb / Booking.com / Vrbo, to stop double-bookings.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {data.calendars!.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-border bg-background px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{c.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {c.ics_url}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px]">
                          {c.last_status === "ok" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500">
                              <Check className="h-3 w-3" /> Synced {relativeTime(c.last_synced_at)}
                            </span>
                          ) : c.last_status === "error" ? (
                            <span className="inline-flex items-center gap-1 text-destructive">
                              <TriangleAlert className="h-3 w-3" />
                              {c.last_error?.slice(0, 60) ?? "Error"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Not yet synced</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => syncM.mutate(c.id)}
                          disabled={syncM.isPending}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-border"
                          title="Sync now"
                        >
                          {syncM.isPending && syncM.variables === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={!!(c as any).business_feed_id}
                          title={
                            (c as any).business_feed_id
                              ? "Managed centrally from your channel manager card"
                              : "Remove"
                          }
                          onClick={() => {
                            if ((c as any).business_feed_id) return;
                            if (confirm(`Remove "${c.name}"?`)) removeM.mutate(c.id);
                          }}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-border text-destructive disabled:opacity-40 disabled:cursor-not-allowed"
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
                  placeholder="Name (e.g. Airbnb, My website)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
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
                  disabled={!name.trim() || !url.trim() || addM.isPending}
                  onClick={() => addM.mutate()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {addM.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Add calendar
                </button>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            iCal sync is near-real-time — typically 5–30 min lag depending on
            each platform. For very high-volume properties or last-minute
            bookings, dates may briefly appear available on multiple platforms.
          </p>
        </>
      )}
    </section>
  );
}
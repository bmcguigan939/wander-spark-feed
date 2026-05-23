import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatICalDate(date: string): string {
  // date is YYYY-MM-DD → YYYYMMDD (all-day VALUE=DATE form)
  return date.replaceAll("-", "");
}

function nowStamp(): string {
  const d = new Date();
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeText(s: string): string {
  return s.replace(/[\\;,]/g, (m) => `\\${m}`).replaceAll("\n", "\\n");
}

function addDays(yyyyMmDd: string, n: number): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/api/public/ical/deal/$dealId/$token.ics")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { dealId, token } = params as { dealId: string; token: string };

        const { data: deal, error: dErr } = await supabaseAdmin
          .from("deals")
          .select("id, title, ical_token")
          .eq("id", dealId)
          .maybeSingle();
        if (dErr || !deal || !deal.ical_token || deal.ical_token !== token) {
          return new Response("Not found", { status: 404 });
        }

        const { data: blocks, error: bErr } = await supabaseAdmin
          .from("deal_blocked_dates")
          .select("id, date, source, summary")
          .eq("deal_id", dealId)
          .gte("date", new Date().toISOString().slice(0, 10))
          .order("date", { ascending: true });
        if (bErr) return new Response("Error", { status: 500 });

        const stamp = nowStamp();
        const lines: string[] = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//Travidz//Deal Calendar//EN",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          `X-WR-CALNAME:${escapeText(`Travidz · ${deal.title ?? "Deal"}`)}`,
        ];

        for (const b of blocks ?? []) {
          const start = b.date as string;
          const end = addDays(start, 1); // DTEND exclusive
          const summary =
            b.source === "travidz_booking"
              ? "Travidz booking"
              : b.source === "manual"
                ? (b.summary ?? "Blocked")
                : (b.summary ?? "Blocked (external)");
          lines.push(
            "BEGIN:VEVENT",
            `UID:travidz-${b.id}@travidz.com`,
            `DTSTAMP:${stamp}`,
            `DTSTART;VALUE=DATE:${formatICalDate(start)}`,
            `DTEND;VALUE=DATE:${formatICalDate(end)}`,
            `SUMMARY:${escapeText(summary)}`,
            "TRANSP:OPAQUE",
            "END:VEVENT",
          );
        }

        lines.push("END:VCALENDAR");

        // iCal lines must use CRLF
        const body = lines.join("\r\n") + "\r\n";
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Cache-Control": "public, max-age=900",
            "Content-Disposition": `inline; filename="travidz-deal-${dealId}.ics"`,
          },
        });
      },
    },
  },
});
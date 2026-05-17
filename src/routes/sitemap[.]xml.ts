import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://wander-spark-feed.lovable.app";

interface Entry { path: string; lastmod?: string; changefreq?: string; priority?: string }

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: Entry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/deals", changefreq: "daily", priority: "0.9" },
          { path: "/destinations", changefreq: "weekly", priority: "0.8" },
          { path: "/map", changefreq: "weekly", priority: "0.6" },
          { path: "/search", changefreq: "weekly", priority: "0.6" },
          { path: "/itineraries", changefreq: "weekly", priority: "0.6" },
          { path: "/collections", changefreq: "weekly", priority: "0.5" },
          { path: "/legal", changefreq: "monthly", priority: "0.3" },
          { path: "/legal/terms", changefreq: "monthly", priority: "0.3" },
          { path: "/legal/privacy", changefreq: "monthly", priority: "0.3" },
          { path: "/legal/cookies", changefreq: "monthly", priority: "0.3" },
          { path: "/legal/creator-agreement", changefreq: "monthly", priority: "0.3" },
          { path: "/legal/business-agreement", changefreq: "monthly", priority: "0.3" },
          { path: "/legal/dmca", changefreq: "monthly", priority: "0.3" },
          { path: "/support", changefreq: "monthly", priority: "0.3" },
        ];

        const entries: Entry[] = [...staticEntries];

        try {
          const [{ data: deals }, { data: dests }, { data: creators }, { data: itins }, { data: collections }, { data: sounds }] = await Promise.all([
            supabaseAdmin.from("deals").select("id,updated_at").eq("is_active", true).eq("status", "approved").order("updated_at", { ascending: false }).limit(2000),
            supabaseAdmin.from("videos").select("country,city").eq("status", "ready").eq("is_hidden", false).eq("is_draft", false).not("country", "is", null).limit(5000),
            supabaseAdmin.from("profiles").select("username,created_at").order("created_at", { ascending: false }).limit(2000),
            supabaseAdmin.from("itineraries").select("id,updated_at").order("updated_at", { ascending: false }).limit(1000),
            supabaseAdmin.from("collections").select("id").eq("visibility", "public").limit(1000),
            supabaseAdmin.from("music_tracks").select("id").eq("is_active", true).limit(500),
          ]);

          for (const d of deals ?? []) {
            entries.push({ path: `/deals/${d.id}`, lastmod: d.updated_at ?? undefined, changefreq: "weekly" });
          }
          const seenCountries = new Set<string>();
          const seenCities = new Set<string>();
          for (const v of dests ?? []) {
            if (v.country && !seenCountries.has(v.country)) {
              seenCountries.add(v.country);
              entries.push({ path: `/destinations/${encodeURIComponent(v.country)}`, changefreq: "weekly" });
            }
            if (v.country && v.city) {
              const k = `${v.country}/${v.city}`;
              if (!seenCities.has(k)) {
                seenCities.add(k);
                entries.push({ path: `/destinations/${encodeURIComponent(v.country)}/${encodeURIComponent(v.city)}`, changefreq: "weekly" });
              }
            }
          }
          for (const p of creators ?? []) entries.push({ path: `/u/${p.username}`, changefreq: "weekly" });
          for (const i of itins ?? []) entries.push({ path: `/itineraries/${i.id}`, lastmod: i.updated_at ?? undefined });
          for (const c of collections ?? []) entries.push({ path: `/collections/${c.id}` });
          for (const s of sounds ?? []) entries.push({ path: `/sounds/${s.id}` });
        } catch (e) {
          console.error("sitemap dynamic entries failed", e);
        }

        const urls = entries.map((e) => [
          `  <url>`,
          `    <loc>${BASE_URL}${e.path}</loc>`,
          e.lastmod ? `    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` : null,
          e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
          e.priority ? `    <priority>${e.priority}</priority>` : null,
          `  </url>`,
        ].filter(Boolean).join("\n"));

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});

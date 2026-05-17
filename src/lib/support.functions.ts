import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { embedText } from "@/lib/ai.functions";
import { COMMISSION } from "@/lib/commission";

// ----------------------------------------------------------------------------
// Phase D #10 — RAG-powered support chat
// Streams an answer using:
//   - a small built-in help corpus (platform mechanics)
//   - semantically retrieved videos + deals (real content on Travidz)
// ----------------------------------------------------------------------------

export type SupportAudience = "traveller" | "creator" | "business";

export type SupportSource = {
  kind: "video" | "deal" | "doc";
  id: string;
  title: string;
  subtitle?: string | null;
  href?: string | null;
};

type ChatMsg = { role: "user" | "assistant"; content: string };

const HELP_DOCS: Array<{
  id: string;
  title: string;
  audience: SupportAudience[];
  body: string;
}> = [
  {
    id: "doc-overview",
    title: "What is Travidz?",
    audience: ["traveller", "creator", "business"],
    body:
      "Travidz is a short-form travel video app. Travellers discover places through creator videos, " +
      "save them into trip collections, plan itineraries, and book deals directly from featured businesses.",
  },
  {
    id: "doc-deals",
    title: "How deals work",
    audience: ["traveller", "creator", "business"],
    body:
      "Deals are real bookable offers (hotels, tours, experiences) submitted by businesses or discovered automatically. " +
      "Tapping a deal opens the business's own website with a tracked redirect — Travidz does not take payment.",
  },
  {
    id: "doc-invites",
    title: "Business invites & commission",
    audience: ["creator", "business"],
    body:
      `Creators can tag a real business they featured and send them an invite link. ` +
      `When the business claims their listing, a deal is created at a flat ${COMMISSION.totalPct}% commission on sales we send them — ` +
      `the creator earns ${COMMISSION.creatorPct}% and Travidz keeps ${COMMISSION.platformPct}%. No setup fee, no monthly cost.`,
  },
  {
    id: "doc-applications",
    title: "Applying to promote a deal",
    audience: ["creator", "business"],
    body:
      "Creators can apply to promote any active deal with a short pitch. The business reviews applications and, " +
      "if approved, assigns the creator a promo code and a custom commission %. The creator can then attach the deal to their videos.",
  },
  {
    id: "doc-itineraries",
    title: "AI itineraries",
    audience: ["traveller"],
    body:
      "From the Itineraries tab, travellers can generate a day-by-day plan for any destination by picking days, budget and interests. " +
      "The plan pulls in real deals and videos from Travidz so each suggestion is bookable.",
  },
  {
    id: "doc-collections",
    title: "Saving & collections",
    audience: ["traveller"],
    body:
      "Double-tap or long-press a video to save it into a collection. Collections are private by default and great for " +
      "organising trip ideas by destination or vibe.",
  },
  {
    id: "doc-discovery",
    title: "Where deals come from",
    audience: ["business", "creator"],
    body:
      "Deals can be submitted directly by a business, claimed via a creator invite, or discovered automatically from public travel sites. " +
      "Auto-discovered deals are scored for quality and only the strongest ones reach the catalog.",
  },
  {
    id: "doc-moderation",
    title: "Moderation & safety",
    audience: ["traveller", "creator", "business"],
    body:
      "Videos and comments run through automated moderation for spam, fake reviews and off-platform link abuse. " +
      "High-confidence issues are auto-hidden; everything else is reviewed by the Travidz team.",
  },
];

function pickDocs(audience: SupportAudience, question: string): typeof HELP_DOCS {
  const q = question.toLowerCase();
  const scoped = HELP_DOCS.filter((d) => d.audience.includes(audience));
  // Cheap keyword scoring — keep at most 4 docs in context.
  const scored = scoped.map((d) => {
    const text = `${d.title} ${d.body}`.toLowerCase();
    let s = 0;
    for (const w of q.split(/\s+/).filter((w) => w.length > 3)) {
      if (text.includes(w)) s += 1;
    }
    return { d, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, 4).map((x) => x.d);
}

async function retrieveSources(
  question: string,
  audience: SupportAudience,
): Promise<{
  docs: typeof HELP_DOCS;
  videos: Array<{ id: string; title: string; destination: string | null; username: string | null }>;
  deals: Array<{ id: string; title: string; city: string | null; country: string | null; url: string | null }>;
}> {
  const docs = pickDocs(audience, question);
  const vec = await embedText(question);
  if (!vec) return { docs, videos: [], deals: [] };
  const qlit = `[${vec.join(",")}]`;

  const [vRes, dRes] = await Promise.all([
    supabaseAdmin.rpc("match_videos" as any, {
      query_embedding: qlit,
      match_count: 4,
      min_similarity: 0.15,
    }),
    supabaseAdmin.rpc("match_deals" as any, {
      query_embedding: qlit,
      match_count: 4,
      min_similarity: 0.15,
      only_active: true,
    }),
  ]);

  const vIds = (vRes.data ?? []).map((r: any) => r.id as string);
  const dIds = (dRes.data ?? []).map((r: any) => r.id as string);

  const [{ data: vRows }, { data: dRows }] = await Promise.all([
    vIds.length
      ? supabaseAdmin
          .from("videos")
          .select("id,title,destination,creator:profiles!videos_creator_id_fkey(username)")
          .in("id", vIds)
      : Promise.resolve({ data: [] as any[] }),
    dIds.length
      ? supabaseAdmin
          .from("deals")
          .select("id,title,city,country,url")
          .in("id", dIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const videos = (vRows ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    destination: r.destination ?? null,
    username: r.creator?.username ?? null,
  }));
  const deals = (dRows ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    city: r.city ?? null,
    country: r.country ?? null,
    url: r.url ?? null,
  }));
  return { docs, videos, deals };
}

function audienceSystem(audience: SupportAudience): string {
  const base =
    "You are Travidz Support, a helpful in-app assistant. Answer concisely (1–4 short paragraphs) in Markdown. " +
    "Use ONLY the provided knowledge — if the answer isn't in it, say so and suggest contacting human support. " +
    "Never invent prices, URLs, or policies. When you reference a real video or deal, mention it by title.";
  if (audience === "business")
    return base + " You are speaking with a business owner. Be commercially clear about commission and onboarding steps.";
  if (audience === "creator")
    return base + " You are speaking with a creator. Be practical about how to tag businesses, apply to deals, and earn commission.";
  return base + " You are speaking with a traveller exploring destinations. Be inspiring but practical.";
}

function buildKnowledgeBlock(ctx: Awaited<ReturnType<typeof retrieveSources>>): string {
  const parts: string[] = [];
  if (ctx.docs.length) {
    parts.push("# Platform help");
    for (const d of ctx.docs) parts.push(`## ${d.title}\n${d.body}`);
  }
  if (ctx.videos.length) {
    parts.push("\n# Relevant videos");
    for (const v of ctx.videos) {
      parts.push(
        `- "${v.title}"${v.destination ? ` — ${v.destination}` : ""}${v.username ? ` by @${v.username}` : ""}`,
      );
    }
  }
  if (ctx.deals.length) {
    parts.push("\n# Relevant deals");
    for (const d of ctx.deals) {
      const loc = [d.city, d.country].filter(Boolean).join(", ");
      parts.push(`- "${d.title}"${loc ? ` — ${loc}` : ""}`);
    }
  }
  return parts.join("\n");
}

function sourcesFromContext(
  ctx: Awaited<ReturnType<typeof retrieveSources>>,
): SupportSource[] {
  const out: SupportSource[] = [];
  for (const v of ctx.videos.slice(0, 4)) {
    out.push({
      kind: "video",
      id: v.id,
      title: v.title,
      subtitle: v.destination,
      href: `/?v=${v.id}`,
    });
  }
  for (const d of ctx.deals.slice(0, 4)) {
    out.push({
      kind: "deal",
      id: d.id,
      title: d.title,
      subtitle: [d.city, d.country].filter(Boolean).join(", ") || null,
      href: `/deals/${d.id}`,
    });
  }
  for (const doc of ctx.docs.slice(0, 3)) {
    out.push({ kind: "doc", id: doc.id, title: doc.title });
  }
  return out;
}

const InputSchema = z.object({
  question: z.string().min(1).max(2000),
  audience: z.enum(["traveller", "creator", "business"]).default("traveller"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(8)
    .default([]),
});

export const askSupport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async function* ({ data }) {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      yield { delta: "Support chat isn't configured (missing AI key). Please contact support@travidz.com.", sources: [] as SupportSource[], done: true };
      return;
    }

    const ctx = await retrieveSources(data.question, data.audience);
    const knowledge = buildKnowledgeBlock(ctx);
    const sources = sourcesFromContext(ctx);

    const messages: ChatMsg[] = [
      { role: "user", content: `KNOWLEDGE:\n${knowledge}\n\n--- end knowledge ---` },
      ...data.history,
      { role: "user", content: data.question },
    ];

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "raw-fetch",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: audienceSystem(data.audience) },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      console.error("[support] gateway error", upstream.status, text);
      yield {
        delta: "Sorry — I couldn't reach the assistant just now. Please try again in a moment.",
        sources,
        done: true,
      };
      return;
    }

    const reader = upstream.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        // Split on SSE event boundaries
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) yield { delta, sources: [] as SupportSource[], done: false };
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } finally {
      try { reader.releaseLock(); } catch {}
    }

    yield { delta: "", sources, done: true };
  });
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/")({
  head: () => ({
    meta: [
      { title: "Legal — Travidz" },
      { name: "description", content: "Travidz legal policies, terms of service, privacy policy and creator and business agreements." },
      { property: "og:title", content: "Legal — Travidz" },
      { property: "og:url", content: "https://wander-spark-feed.lovable.app/legal" },
    ],
    links: [{ rel: "canonical", href: "https://wander-spark-feed.lovable.app/legal" }],
  }),
  component: LegalIndex,
});

const SECTIONS = [
  { to: "/legal/terms", label: "Terms of Service", desc: "The rules for using Travidz." },
  { to: "/legal/privacy", label: "Privacy Policy", desc: "What we collect, why, and how to control it." },
  { to: "/legal/cookies", label: "Cookies Policy", desc: "How we use cookies and similar tech." },
  { to: "/legal/creator-agreement", label: "Creator Agreement", desc: "Terms for publishing videos and using affiliate links." },
  { to: "/legal/business-agreement", label: "Business Agreement", desc: "Terms for listing deals and partnering with creators." },
  { to: "/legal/dmca", label: "DMCA & Takedowns", desc: "How to report copyright infringement." },
] as const;

function LegalIndex() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-display text-4xl font-bold tracking-tight">Legal</h1>
        <p className="mt-3 text-muted-foreground">Plain-English policies covering how Travidz works.</p>
        <ul className="mt-10 divide-y divide-border/40 border-y border-border/40">
          {SECTIONS.map((s) => (
            <li key={s.to}>
              <Link to={s.to} className="flex items-center justify-between gap-4 py-4 hover:bg-muted/30">
                <div>
                  <div className="font-semibold">{s.label}</div>
                  <div className="text-sm text-muted-foreground">{s.desc}</div>
                </div>
                <span className="text-muted-foreground">→</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/" className="mt-12 inline-flex text-sm text-muted-foreground hover:text-foreground">← Back to feed</Link>
      </main>
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/LegalPage";

export const Route = createFileRoute("/legal/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies Policy — Travidz" },
      { name: "description", content: "How Travidz uses cookies and similar technologies." },
      { property: "og:title", content: "Cookies Policy — Travidz" },
      { property: "og:url", content: "https://wander-spark-feed.lovable.app/legal/cookies" },
    ],
    links: [{ rel: "canonical", href: "https://wander-spark-feed.lovable.app/legal/cookies" }],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalPage title="Cookies Policy" updated="May 2026">
      <p>This page explains the cookies and similar technologies that Travidz uses.</p>
      <h2>Strictly necessary</h2>
      <ul>
        <li><strong>Auth session</strong> — keeps you signed in.</li>
        <li><strong>CSRF / security tokens</strong> — protect form submissions.</li>
      </ul>
      <h2>Functional</h2>
      <ul>
        <li><strong>Preferences</strong> — feed tab, language, autoplay toggle.</li>
      </ul>
      <h2>Analytics</h2>
      <p>We measure basic anonymised usage (page views, performance) to improve the product. No third-party advertising cookies are set.</p>
      <h2>Controlling cookies</h2>
      <p>You can clear cookies in your browser settings. Disabling strictly-necessary cookies will sign you out and break some features.</p>
    </LegalPage>
  );
}

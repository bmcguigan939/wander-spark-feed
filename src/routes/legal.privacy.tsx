import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/LegalPage";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Travidz" },
      { name: "description", content: "What Travidz collects, why we collect it, and the choices you have." },
      { property: "og:title", content: "Privacy Policy — Travidz" },
      { property: "og:url", content: "https://wander-spark-feed.lovable.app/legal/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://wander-spark-feed.lovable.app/legal/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="May 2026">
      <p>This policy explains what personal data Travidz collects, how we use it, and the controls you have.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data</strong> — email, username, display name, avatar, role (traveller / creator / business).</li>
        <li><strong>Content you upload</strong> — videos, captions, tags, itineraries, comments, profile bio.</li>
        <li><strong>Usage data</strong> — videos viewed, deals clicked, watch time, device type, approximate location (from IP), and referrer.</li>
        <li><strong>Cookies</strong> — auth session and basic analytics. See the <a href="/legal/cookies">Cookies Policy</a>.</li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To run the service: feed ranking, search, notifications, content moderation.</li>
        <li>To measure performance for creators and businesses (anonymised aggregates).</li>
        <li>To prevent fraud, spam, and abuse.</li>
        <li>To send transactional emails (sign-in, application status, moderation actions). We don't sell your data.</li>
      </ul>
      <h2>Sharing</h2>
      <p>We share data with service providers (hosting, video processing, email delivery) under contract. We do not sell personal data. Businesses see aggregated performance for their own deals; they don't see individual user identities unless you contact them directly.</p>
      <h2>Your rights</h2>
      <p>You can access, export, or delete your data from settings, or by emailing us via the <a href="/support">support page</a>. EU / UK users have rights under GDPR (access, rectification, erasure, portability, objection).</p>
      <h2>Retention</h2>
      <p>We keep account data while your account is active. Deleted accounts and their content are removed within 30 days, except where we must keep records to comply with the law.</p>
      <h2>Children</h2>
      <p>Travidz isn't for users under 13. If you believe a child has signed up, contact us and we'll delete the account.</p>
      <h2>International transfers</h2>
      <p>Data may be processed in regions where our providers operate. We rely on standard contractual safeguards for cross-border transfers.</p>
      <h2>Contact</h2>
      <p>Privacy questions: <a href="/support">support page</a>.</p>
    </LegalPage>
  );
}

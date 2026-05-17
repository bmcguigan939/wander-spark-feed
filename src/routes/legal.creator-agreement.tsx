import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/LegalPage";

export const Route = createFileRoute("/legal/creator-agreement")({
  head: () => ({
    meta: [
      { title: "Creator Agreement — Travidz" },
      { name: "description", content: "Terms for creators publishing videos, applying for deals, and using affiliate links on Travidz." },
      { property: "og:title", content: "Creator Agreement — Travidz" },
      { property: "og:url", content: "https://wander-spark-feed.lovable.app/legal/creator-agreement" },
    ],
    links: [{ rel: "canonical", href: "https://wander-spark-feed.lovable.app/legal/creator-agreement" }],
  }),
  component: CreatorAgreementPage,
});

function CreatorAgreementPage() {
  return (
    <LegalPage title="Creator Agreement" updated="May 2026">
      <p>This agreement applies in addition to the <a href="/legal/terms">Terms of Service</a> when you publish travel content or participate in deals as a Creator on Travidz.</p>
      <h2>1. Original content and rights</h2>
      <p>You confirm that every video, photo, sound and itinerary you upload is yours, or that you have all the rights and releases needed to publish it (music sync, talent releases, location permits).</p>
      <h2>2. Disclosure of paid partnerships</h2>
      <p>Where a video promotes a business under a paid arrangement, you must clearly mark it as a paid partnership in the caption and any voiceover, and comply with local advertising rules (ASA, FTC, etc.).</p>
      <h2>3. Deal applications and approvals</h2>
      <p>Applying for a deal does not guarantee approval. If approved, a Business may issue you a unique code; you must use it only in your own promotional content and never sell or transfer it.</p>
      <h2>4. Affiliate links</h2>
      <p>When you wrap an affiliate link via Travidz, the redirect, tracking parameter, and click logging are part of the service. Don't strip or modify them.</p>
      <h2>5. Earnings (when enabled)</h2>
      <p>Travidz tracks attributed clicks, conversions and commissions. Payouts are not currently available; earnings are accrued as statements only and will be paid out once payments infrastructure is launched.</p>
      <h2>6. Removal and demotion</h2>
      <p>We may demote or remove videos that breach the <a href="/legal/terms">Terms</a>, harm the platform's trust signals, or include misleading travel claims (e.g. unsafe activities marketed as safe).</p>
      <h2>7. Termination</h2>
      <p>Either party can terminate the relationship at any time. Your obligations regarding past deals and disclosure survive termination.</p>
    </LegalPage>
  );
}

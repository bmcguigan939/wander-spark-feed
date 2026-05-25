import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/LegalPage";
import { COMMISSION } from "@/lib/commission";

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
    <LegalPage title="Creator Agreement" updated="November 2026">
      <p>This agreement applies in addition to the <a href="/legal/terms">Terms of Service</a> when you publish travel content or participate in deals as a Creator on Travidz.</p>
      <h2>1. Original content and rights</h2>
      <p>You confirm that every video, photo, sound and itinerary you upload is yours, or that you have all the rights and releases needed to publish it (music sync, talent releases, location permits).</p>
      <h2>2. Disclosure of paid partnerships</h2>
      <p>Where a video promotes a business under a paid arrangement, you must clearly mark it as a paid partnership in the caption and any voiceover, and comply with local advertising rules (ASA, FTC, etc.).</p>
      <h2>3. Deal applications and approvals</h2>
      <p>Applying for a deal does not guarantee approval. If approved, a Business may issue you a unique code; you must use it only in your own promotional content and never sell or transfer it.</p>
      <h2>4. Affiliate links</h2>
      <p>When you wrap an affiliate link via Travidz, the redirect, tracking parameter, and click logging are part of the service. Don't strip or modify them.</p>
      <h2>5. Earnings and commission split</h2>
      <p>Travidz charges a flat <strong>{COMMISSION.totalPct}% commission</strong> on every booking attributed to your content. From that {COMMISSION.totalPct}% we deduct the payment processor's fee ({COMMISSION.stripeVariablePct}% of the booking value plus £0.20 per transaction, charged by Stripe), and the remainder is the <strong>net commission pool</strong>. Your share of that net pool is set by your tier at the moment the booking is confirmed:</p>
      <ul>
        <li><strong>Founding Creator</strong> (first {COMMISSION.foundingCap.toLocaleString()} creators): <strong>50%</strong> of the net pool, locked for the first <strong>{COMMISSION.foundingLockMonths} months</strong> from the date you joined as a creator. After that you fall through to the Power Creator or standard tenure tier, whichever applies.</li>
        <li><strong>Power Creator</strong>: <strong>50%</strong> of the net pool, available to any creator who meets <em>both</em> of the following on a rolling basis: (a) gross booking value attributed to your content of at least <strong>£{Math.round(COMMISSION.powerTierGbvThresholdCents / 100).toLocaleString()}</strong> in the last 12 months, and (b) at least <strong>{COMMISSION.powerTierMinVideosPer30Days} published video every 30 days</strong>. You retain Power Creator status as long as both bars are met; if you fall below either, a <strong>{COMMISSION.powerTierGraceDays}-day grace period</strong> applies before you are reverted to the standard tenure tier. You can re-qualify at any time by meeting both bars again.</li>
        <li><strong>New Creator</strong> (months 1–6 after joining): 50% of the net pool.</li>
        <li><strong>Maturing Creator</strong> (months 7–18): 40% of the net pool.</li>
        <li><strong>Mature Creator</strong> (month 19+): 30% of the net pool, unless your activity keeps you in the Power Creator tier.</li>
      </ul>
      <p>The split applied to each booking is permanently stamped on that booking. Future rule changes do not retroactively reduce earnings already recorded.</p>
      <p>Payouts run weekly and are issued <strong>T+7 from the booked deal's start date</strong>, to the bank account you set in your dashboard. A minimum payout threshold of <strong>£25</strong> applies; balances below that roll over to the next run. Payouts are made in GBP only at launch. If a customer is refunded, the corresponding creator share is reversed from your next payout.</p>
      <p><em>Worked example:</em> a £2,000 booking generates £220 in gross commission (11%). Stripe fees of £58.20 (2.9% + £0.20) come off the top, leaving a net pool of £161.80. A Power or Founding Creator receives £80.90 (50%); a Mature Creator receives £48.54 (30%).</p>
      <h2>6. Removal and demotion</h2>
      <p>We may demote or remove videos that breach the <a href="/legal/terms">Terms</a>, harm the platform's trust signals, or include misleading travel claims (e.g. unsafe activities marketed as safe).</p>
      <h2>7. Termination</h2>
      <p>Either party can terminate the relationship at any time. Your obligations regarding past deals and disclosure survive termination.</p>
    </LegalPage>
  );
}

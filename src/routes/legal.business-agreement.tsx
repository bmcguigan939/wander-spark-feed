import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/LegalPage";
import { COMMISSION } from "@/lib/commission";

export const Route = createFileRoute("/legal/business-agreement")({
  head: () => ({
    meta: [
      { title: "Business Agreement — Travidz" },
      { name: "description", content: "Terms for businesses listing deals and partnering with creators on Travidz." },
      { property: "og:title", content: "Business Agreement — Travidz" },
      { property: "og:url", content: "https://wander-spark-feed.lovable.app/legal/business-agreement" },
    ],
    links: [{ rel: "canonical", href: "https://wander-spark-feed.lovable.app/legal/business-agreement" }],
  }),
  component: BusinessAgreementPage,
});

function BusinessAgreementPage() {
  return (
    <LegalPage title="Business Agreement" updated="May 2026">
      <p>This agreement applies in addition to the <a href="/legal/terms">Terms of Service</a> when you list deals or partner with creators on Travidz as a Business.</p>
      <h2>1. Your listings</h2>
      <p>You confirm the deals you publish are bookable, honest, and not misleading. You're responsible for inventory, fulfilment, pricing, taxes, and any local consumer-protection rules that apply.</p>
      <h2>2. Imagery and content rights</h2>
      <p>You grant Travidz a worldwide, royalty-free licence to display the photos, descriptions and logos you upload for the purpose of operating and marketing the service.</p>
      <h2>3. Working with creators</h2>
      <p>Creator applications are between you and the creator. If you approve an application, you commit to honouring the terms shown (e.g. comp, commission, discount). Don't bypass Travidz to settle commercial terms unrelated to the published deal.</p>
      <h2>4. Tracking and reporting</h2>
      <p>Travidz logs impressions, clicks and (once available) redemptions to help you measure performance. Tracking is on a best-efforts basis and is not a finance system.</p>
      <h2>5. Commissions and payouts</h2>
      <p>Travidz charges a flat <strong>{COMMISSION.totalPct}% commission</strong> on bookings we send you. That 8% is shared between the creator who promoted you and Travidz; the creator's share depends on their tier (see <a href="/legal/creator-agreement">Creator Agreement</a>). Your invoice from Travidz is always the same flat 8% — the internal split does not change what you owe. Payouts and invoicing are not yet enabled; commissions accrue as tracked attributions until payments infrastructure launches.</p>
      <h2>6. Best Price Guarantee & price-match authorisation</h2>
      <p>To protect traveller trust and keep direct bookings competitive with third-party platforms, you authorise Travidz to:</p>
      <p><strong>(a) Automatically check</strong> the publicly bookable price for the same room, activity, date and party size on supported third-party platforms (Booking.com, Expedia, GetYourGuide, Viator, Agoda, Skyscanner, Airalo, and others added over time) at the moment a traveller clicks to book through Travidz.</p>
      <p><strong>(b) Issue a one-time match code</strong> (format <code>TRAVIDZ-MATCH-XXXXXX</code>, valid 24 hours) to that traveller when a third-party price is lower, honouring the third-party price minus Travidz's {COMMISSION.totalPct}% commission, which you agree to accept as full payment for the booking.</p>
      <p><strong>(c) Record and retain evidence</strong> of every check and every match — competitor URL, captured screenshot, price/currency/dates/party-size used, timestamp, and cryptographic hash — and make it visible to you in real time via your dashboard so you can independently verify the match was fair. You may dispute any match within 14 days by submitting counter-evidence; verified disputes are removed from settlement.</p>
      <p>Worked example: if Booking.com is showing your room at £200, Travidz issues a code valid for £200. You invoice £200, Travidz invoices you {COMMISSION.totalPct}% (£16), you keep £184 — meaningfully more than the ~£164 you would net after Booking's typical 18% commission. You represent that you can lawfully match third-party rates under your own platform parity agreements (most OTA contracts permit equal or lower direct rates).</p>
      <h2>7. Suspension</h2>
      <p>We may pause or remove listings that breach the <a href="/legal/terms">Terms</a>, generate excessive complaints, or harm user trust.</p>
      <h2>8. Termination</h2>
      <p>You can remove your listings at any time. Obligations to fulfil bookings already made through Travidz survive termination.</p>
    </LegalPage>
  );
}

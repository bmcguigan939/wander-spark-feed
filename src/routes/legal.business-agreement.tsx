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
    <LegalPage title="Business Agreement" updated="November 2026">
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
      <p>Travidz charges a flat <strong>{COMMISSION.totalPct}% commission</strong> on bookings we send you. That {COMMISSION.totalPct}% is shared between the creator who promoted you and Travidz; the creator's share depends on their tier (see <a href="/legal/creator-agreement">Creator Agreement</a>). The internal split does not change what you owe — it's always a flat {COMMISSION.totalPct}% of the booking value.</p>
      <p>For bookable deals, Travidz collects the customer's payment, retains the {COMMISSION.totalPct}% commission, and pays the net to the bank account you set in your dashboard. <strong>Payouts run weekly and are issued T+7 from each deal's start date</strong> — a short hold that covers the refund window. A minimum payout threshold of <strong>£25</strong> applies; balances below that roll over to the next run. Payouts are made in GBP only at launch.</p>
      <p>You must set up a payout method (a UK sort code + account, an IBAN, or a SWIFT/BIC) before you can list a bookable deal. Without one, your listings remain non-bookable.</p>
      <h2>5a. Activity operators (operator-markup pricing)</h2>
      <p>If you list an activity or tour as the <strong>operator</strong> (i.e. you are the direct provider, not a reseller), you may opt in to <em>operator-markup pricing</em>. You set your per-person base price equal to the price you charge on your own website. Travidz adds an <strong>11% booking fee</strong> on top, and that uplift — not 11% of your base — is the commission pool Travidz retains. Your net payout per booking equals your base price.</p>
      <p>Operator-markup listings must be bookable through Travidz so we can collect the 11% at checkout. Where we run third-party reseller price comparisons for your listing, we deliberately exclude your own website from the comparison set and never present it as a competing offer. You confirm that listing on Travidz under this model does not breach any parity or distribution agreement you hold with third-party resellers.</p>
      <h2>6. Refunds and chargebacks</h2>
      <p>You set the refund policy for each deal you publish, and that policy is shown to the customer before they pay. You decide whether to approve a customer's refund request in line with that policy.</p>
      <p>When you approve a refund, Travidz facilitates the return of funds through the payment processor on your behalf. The refunded amount — and the corresponding {COMMISSION.totalPct}% commission, which is also reversed — is deducted from your next payout.</p>
      <p>Chargebacks raised by a customer's bank are deducted from your next payout while they are investigated; you can submit a dispute via your dashboard, and any amount successfully recovered is credited back.</p>
      <h2>7. Best Price Guarantee & price-match authorisation</h2>
      <p>To protect traveller trust and keep direct bookings competitive with third-party platforms, you authorise Travidz to:</p>
      <p><strong>(a) Automatically check</strong> the publicly bookable price for the same room, activity, date and party size on supported third-party platforms (Booking.com, Expedia, GetYourGuide, Viator, Agoda, Skyscanner, Airalo, and others added over time) at the moment a traveller clicks to book through Travidz.</p>
      <p><strong>(b) Issue a one-time match code</strong> (format <code>TRAVIDZ-MATCH-XXXXXX</code>, valid 24 hours) to that traveller when a third-party price is lower, honouring the third-party price minus Travidz's {COMMISSION.totalPct}% commission, which you agree to accept as full payment for the booking.</p>
      <p><strong>(c) Record and retain evidence</strong> of every check and every match — competitor URL, captured screenshot, price/currency/dates/party-size used, timestamp, and cryptographic hash — and make it visible to you in real time via your dashboard so you can independently verify the match was fair. You may dispute any match within 14 days by submitting counter-evidence; verified disputes are removed from settlement.</p>
      <p>Worked example: if Booking.com is showing your room at £200, Travidz issues a code valid for £200. You invoice £200, Travidz invoices you {COMMISSION.totalPct}% (£22), you keep £178 — meaningfully more than the ~£164 you would net after Booking's typical 18% commission. You represent that you can lawfully match third-party rates under your own platform parity agreements (most OTA contracts permit equal or lower direct rates).</p>
      <h2>8. Suspension</h2>
      <p>We may pause or remove listings that breach the <a href="/legal/terms">Terms</a>, generate excessive complaints, or harm user trust.</p>
      <h2>9. Termination</h2>
      <p>You can remove your listings at any time. Obligations to fulfil bookings already made through Travidz survive termination.</p>
      <h2>10. Bank details and security</h2>
      <p>The bank details you provide for payouts are encrypted at rest using a key held in our secure vault. Decryption is restricted to authorised support staff for the sole purpose of operating payouts and resolving payout issues. Bank details are never exposed to other users, to creators, or in any public API response.</p>
    </LegalPage>
  );
}

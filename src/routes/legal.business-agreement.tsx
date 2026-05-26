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
      <p>For bookable deals, payments are processed by <strong>Stripe</strong>. At checkout, Stripe splits each charge automatically: the {COMMISSION.totalPct}% commission (or, for operator-markup listings, the uplift above your base price) is routed to Travidz as a platform fee, and the remainder is transferred directly to your connected Stripe account. Travidz never holds your funds.</p>
      <p>Stripe controls the payout schedule (default daily rolling, typically T+2 to T+7 depending on your country and history) and pays directly to the bank account you link during Stripe onboarding. Payout currency and minimums are set by Stripe based on your country.</p>
      <h2>5b. Stripe Connect onboarding (KYC)</h2>
      <p>Before you can list a bookable deal, you must complete <strong>Stripe Express onboarding</strong> from your Travidz dashboard. Stripe — not Travidz — collects and verifies your business details, beneficial-owner information, and bank account, in line with anti-money-laundering, sanctions, and know-your-customer regulations. Until Stripe marks your account as <em>charges enabled</em> and <em>payouts enabled</em>, your listings remain non-bookable.</p>
      <p>You can update your bank account, payout schedule, view payout history, and download tax forms (including IRS Form 1099-K in the US where applicable) at any time from the Stripe Express dashboard, accessible from your Travidz business settings. Stripe is the data controller for KYC information you submit through Stripe's hosted forms.</p>
      <h2>5a. Activity operators (operator-markup pricing)</h2>
      <p>If you list an activity or tour as the <strong>operator</strong> (i.e. you are the direct provider, not a reseller), you may opt in to <em>operator-markup pricing</em>. You set your per-person base price equal to the price you charge on your own website. Travidz adds an <strong>11% booking fee</strong> on top, and that uplift — not 11% of your base — is the commission pool Travidz retains as the Stripe platform fee. Your gross payout per booking equals your base price (Stripe processing fees are deducted by Stripe from your share, as in any direct Stripe checkout).</p>
      <p>Operator-markup listings must be bookable through Travidz so we can collect the 11% at checkout. Where we run third-party reseller price comparisons for your listing, we deliberately exclude your own website (if you have one) from the comparison set and never present it as a competing offer. You confirm that listing on Travidz under this model does not breach any parity or distribution agreement you hold with third-party resellers.</p>
      <h2>5c. Travidz-hosted stores</h2>
      <p>You are not required to operate your own website. If you don't have one, your store lives on Travidz: customers discover, view availability, and pay on a Travidz-hosted listing page, and the booking is processed through Stripe Connect under the same {COMMISSION.totalPct}% commission terms. You can add or change an external direct-booking URL later from your business dashboard.</p>
      <h2>6. Refunds and chargebacks</h2>
      <p>You set the refund policy for each deal you publish, and that policy is shown to the customer before they pay. You decide whether to approve a customer's refund request in line with that policy.</p>
      <p>When you approve a refund, Travidz instructs Stripe to issue the refund and to reverse the corresponding platform fee. The refund is debited from your connected Stripe balance; if your balance is insufficient, Stripe will debit your linked bank account in line with its standard terms.</p>
      <p>Chargebacks raised by a customer's bank are handled by Stripe and debited from your connected account while they are investigated. You can submit evidence via the Stripe Express dashboard; any amount Stripe successfully recovers is credited back to your account.</p>
      <h2>7. Best Price Guarantee & price-match authorisation</h2>
      <p>To protect traveller trust and keep direct bookings competitive with third-party platforms, you authorise Travidz to:</p>
      <p><strong>(a) Automatically check</strong> the publicly bookable price for the same room, activity, date and party size on supported third-party platforms (Booking.com, Expedia, GetYourGuide, Viator, Agoda, Skyscanner, Airalo, and others added over time) at the moment a traveller clicks to book through Travidz.</p>
      <p><strong>(b) Issue a one-time match code</strong> (format <code>TRAVIDZ-MATCH-XXXXXX</code>, valid 24 hours) to that traveller when a third-party price is lower, honouring the third-party price minus Travidz's {COMMISSION.totalPct}% commission, which you agree to accept as full payment for the booking.</p>
      <p><strong>(c) Record and retain evidence</strong> of every check and every match — competitor URL, captured screenshot, price/currency/dates/party-size used, timestamp, and cryptographic hash — and make it visible to you promptly via your <a href="/business/price-audit">price-audit dashboard</a> so you can independently verify the match was fair. You may dispute any match within 14 days by submitting counter-evidence; verified disputes void the match.</p>
      <p>Worked example: if Booking.com is showing your room at £200, Travidz issues a code valid for £200. You invoice £200, Travidz invoices you {COMMISSION.totalPct}% (£22), you keep £178 — meaningfully more than the ~£164 you would net after Booking's typical 18% commission. You represent that you can lawfully match third-party rates under your own platform parity agreements (most OTA contracts permit equal or lower direct rates).</p>
      <h2>8. Suspension</h2>
      <p>We may pause or remove listings that breach the <a href="/legal/terms">Terms</a>, generate excessive complaints, or harm user trust.</p>
      <h2>9. Termination</h2>
      <p>You can remove your listings at any time. Obligations to fulfil bookings already made through Travidz survive termination.</p>
      <h2>10. Bank details and security</h2>
      <p>Bank account details are collected and stored by <strong>Stripe</strong> through Stripe-hosted onboarding forms. Travidz never sees or stores your full bank account number. We only receive a Stripe-issued account identifier and high-level status flags (charges enabled, payouts enabled, outstanding requirements) so we can show you the right state in your dashboard and gate bookable listings.</p>
    </LegalPage>
  );
}

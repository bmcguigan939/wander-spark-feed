import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/LegalPage";

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
      <p>Payouts and invoicing are not currently enabled. Commission terms agreed with creators accrue as tracked attributions until payments infrastructure is launched.</p>
      <h2>6. Suspension</h2>
      <p>We may pause or remove listings that breach the <a href="/legal/terms">Terms</a>, generate excessive complaints, or harm user trust.</p>
      <h2>7. Termination</h2>
      <p>You can remove your listings at any time. Obligations to fulfil bookings already made through Travidz survive termination.</p>
    </LegalPage>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/LegalPage";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Travidz" },
      { name: "description", content: "The rules for using Travidz: accounts, content, deals, and acceptable use." },
      { property: "og:title", content: "Terms of Service — Travidz" },
      { property: "og:url", content: "https://wander-spark-feed.lovable.app/legal/terms" },
    ],
    links: [{ rel: "canonical", href: "https://wander-spark-feed.lovable.app/legal/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 2026">
      <p>Welcome to Travidz. By creating an account or using the service you agree to these Terms. If you don't agree, please don't use Travidz.</p>
      <h2>1. Who can use Travidz</h2>
      <p>You must be at least 13 years old (or the minimum digital-consent age in your country). You're responsible for your account and for anything done with it. Keep your credentials secure.</p>
      <h2>2. Your content</h2>
      <p>You keep ownership of the videos, photos, itineraries and other content you post. By posting, you grant Travidz a worldwide, royalty-free licence to host, display, reproduce, adapt (for thumbnails, captions, translations) and distribute that content as part of the service and our marketing.</p>
      <p>You promise that you have the rights to everything you post and that it doesn't infringe anyone else's rights.</p>
      <h2>3. Acceptable use</h2>
      <ul>
        <li>No illegal, hateful, sexual, violent, or deceptive content.</li>
        <li>No spam, scraping, automation that isn't expressly allowed, or attempts to break the service.</li>
        <li>No impersonating other people, brands, or destinations.</li>
        <li>Disclose paid partnerships clearly.</li>
      </ul>
      <h2>4. Deals and affiliate links</h2>
      <p>Travel deals shown on Travidz are operated by third-party businesses. The deal itself — the room, the activity, the experience — is delivered by the business, and your contract for delivery is with them. For bookable deals, Travidz processes the payment on the business's behalf via our payment processor and acts as merchant of record for the transaction. Prices, availability and conditions can change without notice; the price you see at checkout is the price you pay.</p>
      <h2>5. Bookings, payment and refunds</h2>
      <p>When you complete checkout for a bookable deal, you'll receive a confirmation email and a booking record in your account. Payment is taken in GBP through our payment processor; we never store your full card details.</p>
      <p>Each deal carries a refund policy set by the business, shown to you before you pay. Refund decisions are made by the business; where they approve a refund, Travidz facilitates the return of funds through the payment processor.</p>
      <p>Most travel bookings — accommodation, transport, car hire, catering and leisure services tied to specific dates — are exempt from the statutory 14-day cooling-off right under UK and EU consumer law. The deal's stated refund policy applies instead.</p>
      <h2>6. Account suspension and termination</h2>
      <p>We can suspend or terminate accounts that violate these Terms, abuse the service, or put other users at risk. You can delete your account at any time from settings.</p>
      <h2>7. Disclaimers</h2>
      <p>Travidz is provided "as is". We don't warrant that travel information, deals, or creator recommendations are accurate, current, or suitable for your trip.</p>
      <h2>8. Liability</h2>
      <p>To the maximum extent permitted by law, Travidz isn't liable for indirect, incidental, or consequential damages arising from your use of the service.</p>
      <h2>9. Changes</h2>
      <p>We may update these Terms. Material changes will be announced in-app. Continued use after a change means you accept it.</p>
      <h2>10. Contact</h2>
      <p>Questions? Reach us via the <a href="/support">support page</a>.</p>
    </LegalPage>
  );
}

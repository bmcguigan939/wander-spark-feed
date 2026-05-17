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
    <LegalPage title="Terms of Service" updated="May 2026">
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
      <p>Travel deals shown on Travidz are operated by third-party businesses. We don't sell, ship, or fulfil bookings. Your contract is with the business. Prices, availability, and conditions can change without notice.</p>
      <h2>5. Account suspension and termination</h2>
      <p>We can suspend or terminate accounts that violate these Terms, abuse the service, or put other users at risk. You can delete your account at any time from settings.</p>
      <h2>6. Disclaimers</h2>
      <p>Travidz is provided "as is". We don't warrant that travel information, deals, or creator recommendations are accurate, current, or suitable for your trip.</p>
      <h2>7. Liability</h2>
      <p>To the maximum extent permitted by law, Travidz isn't liable for indirect, incidental, or consequential damages arising from your use of the service.</p>
      <h2>8. Changes</h2>
      <p>We may update these Terms. Material changes will be announced in-app. Continued use after a change means you accept it.</p>
      <h2>9. Contact</h2>
      <p>Questions? Reach us via the <a href="/support">support page</a>.</p>
    </LegalPage>
  );
}

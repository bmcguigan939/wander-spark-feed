import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/LegalPage";

export const Route = createFileRoute("/legal/dmca")({
  head: () => ({
    meta: [
      { title: "DMCA & Takedowns — Travidz" },
      { name: "description", content: "How to report copyright infringement on Travidz and how we handle takedown notices." },
      { property: "og:title", content: "DMCA & Takedowns — Travidz" },
      { property: "og:url", content: "https://wander-spark-feed.lovable.app/legal/dmca" },
    ],
    links: [{ rel: "canonical", href: "https://wander-spark-feed.lovable.app/legal/dmca" }],
  }),
  component: DmcaPage,
});

function DmcaPage() {
  return (
    <LegalPage title="DMCA & Takedowns" updated="May 2026">
      <p>Travidz respects intellectual property rights. If you believe content on Travidz infringes your copyright, please send a notice with the following:</p>
      <ul>
        <li>Your full name, address, phone and email.</li>
        <li>A description of the copyrighted work you claim is infringed.</li>
        <li>The URL of the video, comment, or asset on Travidz.</li>
        <li>A statement, made in good faith, that the use is not authorised by the copyright owner.</li>
        <li>A statement, under penalty of perjury, that the information is accurate and that you are the rights holder or are authorised to act on their behalf.</li>
        <li>Your physical or electronic signature.</li>
      </ul>
      <h2>Where to send notices</h2>
      <p>Submit DMCA notices via the <a href="/support">support page</a>. We act on valid notices promptly, typically within 5 business days, and may remove or restrict access to the reported content.</p>
      <h2>Counter-notices</h2>
      <p>If your content was removed in error you can submit a counter-notice with the same fields plus a statement, under penalty of perjury, that the removal was a mistake.</p>
      <h2>Repeat infringers</h2>
      <p>We terminate accounts of repeat infringers in appropriate cases.</p>
    </LegalPage>
  );
}

import { createFileRoute } from "@tanstack/react-router";

// Legacy click-through endpoint.
//
// Travidz is now a closed-loop OTA: travellers book on Travidz, not on the
// partner's own site. Outbound redirects to business websites have been
// removed entirely (no "Book direct" leakage, no commission bypass).
// This route now returns 404 for everyone — it stays defined so cached
// links from older sessions or shared URLs die cleanly instead of erroring.
export const Route = createFileRoute("/api/public/b/$id")({
  server: {
    handlers: {
      GET: async () => {
        return new Response("Not found", {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        });
      },
    },
  },
});
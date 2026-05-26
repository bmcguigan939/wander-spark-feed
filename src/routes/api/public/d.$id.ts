import { createFileRoute } from "@tanstack/react-router";

// Legacy deal click-through. Travidz is now a closed-loop OTA — all bookings
// happen on Travidz, never on partner sites. Returns 404 so cached/shared
// links from older sessions die cleanly. Use `/deals/$id` instead.
export const Route = createFileRoute("/api/public/d/$id")({
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
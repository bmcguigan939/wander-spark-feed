import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /admin",
          "Disallow: /studio",
          "Disallow: /business",
          "Disallow: /creator",
          "Disallow: /api/",
          "Disallow: /r/",
          "Disallow: /reset-password",
          "Disallow: /welcome",
          "",
          "Sitemap: https://travidz.com/sitemap.xml",
          "",
        ].join("\n");
        return new Response(body, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
        });
      },
    },
  },
});

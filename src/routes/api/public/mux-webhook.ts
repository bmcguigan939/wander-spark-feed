import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/mux-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.MUX_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook not configured", { status: 500 });

        const sigHeader = request.headers.get("mux-signature") ?? "";
        const body = await request.text();

        // Mux signature format: "t=<unix>,v1=<hex>"
        const parts = Object.fromEntries(
          sigHeader.split(",").map((kv) => kv.split("=") as [string, string])
        );
        const t = parts["t"];
        const v1 = parts["v1"];
        if (!t || !v1) return new Response("Bad signature", { status: 401 });

        const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
        const a = Buffer.from(expected, "hex");
        const b = Buffer.from(v1, "hex");
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(body) as { type: string; data: any };

        if (event.type === "video.asset.ready") {
          const asset = event.data;
          const uploadId = asset.upload_id as string | undefined;
          const assetId = asset.id as string;
          const playback = asset.playback_ids?.[0]?.id as string | undefined;
          const duration = asset.duration as number | undefined;
          const thumbnail = playback ? `https://image.mux.com/${playback}/thumbnail.jpg?width=540&fit_mode=preserve` : null;

          // Match by upload_id first, then by asset_id
          let query = supabaseAdmin.from("videos").update({
            status: "ready",
            mux_asset_id: assetId,
            mux_playback_id: playback ?? null,
            duration_sec: duration ?? null,
            thumbnail_url: thumbnail,
          });
          if (uploadId) query = query.eq("mux_upload_id", uploadId);
          else query = query.eq("mux_asset_id", assetId);
          const { error } = await query;
          if (error) console.error("[mux-webhook] update ready failed:", error.message);
        } else if (event.type === "video.asset.errored" || event.type === "video.upload.errored") {
          const uploadId = event.data?.upload_id as string | undefined;
          const assetId = event.data?.asset_id ?? event.data?.id;
          let query = supabaseAdmin.from("videos").update({ status: "errored" });
          if (uploadId) query = query.eq("mux_upload_id", uploadId);
          else if (assetId) query = query.eq("mux_asset_id", assetId);
          else return new Response("ok");
          await query;
        } else if (event.type === "video.upload.asset_created") {
          const uploadId = event.data?.id as string;
          const assetId = event.data?.asset_id as string | undefined;
          if (uploadId && assetId) {
            await supabaseAdmin.from("videos").update({ mux_asset_id: assetId, status: "processing" }).eq("mux_upload_id", uploadId);
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
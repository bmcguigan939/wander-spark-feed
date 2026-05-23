import { createFileRoute } from "@tanstack/react-router"
import { supabaseAdmin } from "@/integrations/supabase/client.server"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export const Route = createFileRoute("/lovable/email/unsubscribe")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),

      GET: async ({ request }) => {
        const url = new URL(request.url)
        const token = url.searchParams.get("token")?.trim()
        if (!token) {
          return Response.json(
            { valid: false, error: "missing token" },
            { status: 400, headers: corsHeaders }
          )
        }
        const { data, error } = await supabaseAdmin
          .from("email_unsubscribe_tokens")
          .select("email, used_at")
          .eq("token", token)
          .maybeSingle()
        if (error || !data) {
          return Response.json(
            { valid: false, error: "invalid token" },
            { status: 404, headers: corsHeaders }
          )
        }
        return Response.json(
          { valid: true, email: data.email, used: Boolean(data.used_at) },
          { headers: corsHeaders }
        )
      },

      POST: async ({ request }) => {
        let body: { token?: string } = {}
        try {
          body = await request.json()
        } catch {
          return Response.json(
            { ok: false, error: "invalid body" },
            { status: 400, headers: corsHeaders }
          )
        }
        const token = body.token?.trim()
        if (!token) {
          return Response.json(
            { ok: false, error: "missing token" },
            { status: 400, headers: corsHeaders }
          )
        }

        const { data: row, error: lookupErr } = await supabaseAdmin
          .from("email_unsubscribe_tokens")
          .select("email, used_at")
          .eq("token", token)
          .maybeSingle()
        if (lookupErr || !row) {
          return Response.json(
            { ok: false, error: "invalid token" },
            { status: 404, headers: corsHeaders }
          )
        }

        const email = row.email.toLowerCase()

        // Idempotent suppression upsert.
        const { data: existingSupp } = await supabaseAdmin
          .from("suppressed_emails")
          .select("id")
          .eq("email", email)
          .maybeSingle()
        if (!existingSupp) {
          await supabaseAdmin.from("suppressed_emails").insert({
            email,
            reason: "unsubscribe",
            metadata: { source: "unsubscribe_link" },
          })
        }

        if (!row.used_at) {
          await supabaseAdmin
            .from("email_unsubscribe_tokens")
            .update({ used_at: new Date().toISOString() })
            .eq("token", token)
        }

        return Response.json(
          { ok: true, email, alreadyUnsubscribed: Boolean(row.used_at) },
          { headers: corsHeaders }
        )
      },
    },
  },
})
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PayloadSchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).optional().nullable(),
  route: z.string().max(500).optional().nullable(),
  source: z.string().max(120).optional().nullable(),
  user_agent: z.string().max(500).optional().nullable(),
  severity: z.enum(["error", "warning", "info"]).default("error"),
  context: z.record(z.string(), z.any()).optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
});

export const logClientError = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PayloadSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      await supabaseAdmin.from("client_error_logs").insert({
        message: data.message,
        stack: data.stack ?? null,
        route: data.route ?? null,
        source: data.source ?? null,
        user_agent: data.user_agent ?? null,
        severity: data.severity,
        context: data.context ?? null,
        user_id: data.user_id ?? null,
      });
    } catch (e) {
      console.error("[errors] failed to log client error", e);
    }
    return { ok: true };
  });

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listClientErrors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("client_error_logs")
      .select("id,user_id,route,message,stack,source,user_agent,severity,context,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { errors: data ?? [] };
  });
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Operator external-website path was removed — every shop now sells through
// Travidz. These stubs remain so existing imports keep compiling; they
// simply report "no operator site".
export const getMyOperatorSite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ operator_site_url: null, operator_site_host: null }));

export const updateMyOperatorSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => input as { operator_site_url: string | null })
  .handler(async () => ({ ok: true }));
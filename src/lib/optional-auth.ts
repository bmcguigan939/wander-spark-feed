import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Optional Supabase auth middleware: extracts the session if present but
 * does NOT reject the request when missing. Use for public-facing server
 * functions that personalise their response when the caller is signed in.
 * Never trust client-supplied userId fields — always read from context.userId here.
 */
export const optionalSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !authHeader?.startsWith("Bearer ")) {
      return next({ context: { userId: null as string | null } });
    }
    const token = authHeader.replace("Bearer ", "");
    if (!token) return next({ context: { userId: null as string | null } });

    try {
      const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data } = await supabase.auth.getClaims(token);
      const userId = (data?.claims?.sub as string | undefined) ?? null;
      return next({ context: { userId } });
    } catch {
      return next({ context: { userId: null as string | null } });
    }
  },
);
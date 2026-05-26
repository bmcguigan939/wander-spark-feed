import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyOperatorSite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("operator_site_url,operator_site_host")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      operator_site_url: (data as any)?.operator_site_url ?? null,
      operator_site_host: (data as any)?.operator_site_host ?? null,
    };
  });

export const updateMyOperatorSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        operator_site_url: z
          .string()
          .url()
          .max(500)
          .nullable()
          .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ operator_site_url: data.operator_site_url })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
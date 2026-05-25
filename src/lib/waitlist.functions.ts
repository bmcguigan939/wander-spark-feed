import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Public — anyone (signed in or not) can join the launch waitlist for the
 * native iOS / Android apps. RLS on the table already restricts reads to
 * admins; this server fn just adds the row.
 */
export const joinLaunchWaitlist = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email().max(320),
        platform: z.enum(["ios", "android", "both"]),
        source: z.string().max(64).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("launch_waitlist")
      .upsert(
        {
          email: data.email.trim().toLowerCase(),
          platform: data.platform,
          source: data.source ?? "download_page",
        },
        { onConflict: "email,platform", ignoreDuplicates: true },
      );
    if (error) {
      // Duplicate is fine (idempotent).
      if (!/duplicate|unique/i.test(error.message)) {
        throw new Error(error.message);
      }
    }
    return { ok: true };
  });
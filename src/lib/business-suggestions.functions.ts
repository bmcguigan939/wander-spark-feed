import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runBusinessExtraction } from "@/lib/ai.functions";

export type BusinessSuggestion = {
  id: string;
  video_id: string;
  name: string;
  category: string | null;
  city: string | null;
  country: string | null;
  website_guess: string | null;
  confidence: number | null;
  source: string | null;
  status: "pending" | "converted" | "dismissed";
  converted_invite_id: string | null;
  detected_at: string;
};

async function assertOwner(videoId: string, userId: string) {
  const { data: v } = await supabaseAdmin
    .from("videos")
    .select("creator_id")
    .eq("id", videoId)
    .maybeSingle();
  if (!v || v.creator_id !== userId) throw new Error("Not allowed");
}

export const listSuggestionsForVideo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ videoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<BusinessSuggestion[]> => {
    await assertOwner(data.videoId, context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("video_business_suggestions")
      .select("*")
      .eq("video_id", data.videoId)
      .eq("status", "pending")
      .order("confidence", { ascending: false, nullsFirst: false })
      .order("detected_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows as BusinessSuggestion[]) ?? [];
  });

export const dismissSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row } = await supabaseAdmin
      .from("video_business_suggestions")
      .select("id, video_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Not found");
    await assertOwner(row.video_id, context.userId);
    const { error } = await supabaseAdmin
      .from("video_business_suggestions")
      .update({ status: "dismissed" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markSuggestionConverted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        inviteId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row } = await supabaseAdmin
      .from("video_business_suggestions")
      .select("id, video_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Not found");
    await assertOwner(row.video_id, context.userId);
    const { error } = await supabaseAdmin
      .from("video_business_suggestions")
      .update({ status: "converted", converted_invite_id: data.inviteId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rerunBusinessExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ videoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(data.videoId, context.userId);
    await runBusinessExtraction(data.videoId);
    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { COMMISSION } from "@/lib/commission";

// ----------------------------------------------------------------------------
// Phase D #9 — AI outreach / response drafts
// ----------------------------------------------------------------------------

const DraftSchema = z.object({
  subject: z.string().min(1).max(160),
  body: z.string().min(20).max(4000),
});
type Draft = z.infer<typeof DraftSchema>;

async function callDraftGateway(system: string, user: string): Promise<Draft | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "raw-fetch",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    console.error("[outreach] gateway error", res.status, await res.text().catch(() => ""));
    return null;
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    return DraftSchema.parse(JSON.parse(raw));
  } catch (e) {
    console.error("[outreach] parse failed", e);
    return null;
  }
}

function fallbackInviteDraft(args: {
  businessName: string;
  creatorName: string;
  videoTitle: string;
  inviteUrl: string;
}): Draft {
  return {
    subject: `Featured ${args.businessName} on Travidz — claim your listing`,
    body:
      `Hi ${args.businessName} team,\n\n` +
      `I'm ${args.creatorName} — I recently featured you in my Travidz video "${args.videoTitle}" and travellers have been asking how to book directly with you.\n\n` +
      `Travidz lets you advertise your direct website for a flat ${COMMISSION.totalPct}% commission on sales we send you — no setup fee, no monthly cost.\n\n` +
      `Claim your listing in one click:\n${args.inviteUrl}\n\n` +
      `Happy to answer any questions.\n\nThanks,\n${args.creatorName}`,
  };
}

export const draftInviteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ inviteId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<Draft> => {
    const { userId } = context;
    const { data: inv, error } = await supabaseAdmin
      .from("business_invites")
      .select("id,creator_id,business_name,website_url,city,token,video_id")
      .eq("id", data.inviteId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv || inv.creator_id !== userId) throw new Error("Not allowed");

    const [{ data: creator }, { data: video }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("display_name,username")
        .eq("id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("videos")
        .select("title,description,destination,view_count,like_count")
        .eq("id", inv.video_id)
        .maybeSingle(),
    ]);

    const creatorName =
      creator?.display_name || (creator?.username ? `@${creator.username}` : "a Travidz creator");
    const inviteUrl = `https://travidz.com/business/invite/${inv.token}`;
    const videoTitle = video?.title ?? "a recent video";

    const system =
      "You write warm, concise outreach emails from a travel creator to a local business they featured in a short video. " +
      "Tone: friendly, professional, never salesy or pushy. Mention specific details from the video when helpful. " +
      "Keep the body under 180 words. End with a clear single-line CTA containing the invite URL. " +
      "Reply ONLY with JSON: { subject: string, body: string } where body is plain text with \\n line breaks.";

    const user = [
      `Creator: ${creatorName}`,
      `Business: ${inv.business_name}${inv.city ? ` (${inv.city})` : ""}`,
      `Their website: ${inv.website_url}`,
      `Video title: ${videoTitle}`,
      video?.description ? `Video description: ${video.description.slice(0, 400)}` : "",
      video?.destination ? `Destination: ${video.destination}` : "",
      video ? `Performance: ${video.view_count ?? 0} views, ${video.like_count ?? 0} likes` : "",
      `Offer: flat ${COMMISSION.totalPct}% commission on sales Travidz sends them, no setup or monthly fee.`,
      `Invite URL (include verbatim in the email body): ${inviteUrl}`,
      ``,
      `Write the email draft as JSON.`,
    ]
      .filter(Boolean)
      .join("\n");

    const draft = await callDraftGateway(system, user);
    if (draft) return draft;
    return fallbackInviteDraft({
      businessName: inv.business_name,
      creatorName,
      videoTitle,
      inviteUrl,
    });
  });

function fallbackApplicationReply(args: {
  creatorName: string;
  businessName: string;
  dealTitle: string;
  decision: "approved" | "declined";
  code?: string | null;
  commission?: number | null;
}): Draft {
  if (args.decision === "approved") {
    return {
      subject: `You're approved — ${args.dealTitle}`,
      body:
        `Hi ${args.creatorName},\n\n` +
        `Thanks for applying to promote ${args.dealTitle}. We loved your pitch and you're approved!\n\n` +
        (args.code ? `Promo code: ${args.code}\n` : "") +
        (args.commission != null ? `Commission: ${args.commission}% on every confirmed sale.\n` : "") +
        `\nGo create — let us know if you need anything.\n\n— ${args.businessName}`,
    };
  }
  return {
    subject: `Update on your application — ${args.dealTitle}`,
    body:
      `Hi ${args.creatorName},\n\n` +
      `Thanks so much for your interest in promoting ${args.dealTitle}. Unfortunately we can't move forward with this collaboration right now, but we'd love to stay in touch for future campaigns.\n\n` +
      `Best,\n${args.businessName}`,
  };
}

export const draftApplicationReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        decision: z.enum(["approved", "declined"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<Draft> => {
    const { userId } = context;
    const { data: app, error } = await supabaseAdmin
      .from("deal_applications")
      .select(
        "id,business_id,creator_id,deal_id,pitch,requested_code,approved_code,commission_pct",
      )
      .eq("id", data.applicationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!app || app.business_id !== userId) throw new Error("Not allowed");

    const [{ data: creator }, { data: business }, { data: deal }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("display_name,username")
        .eq("id", app.creator_id)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("display_name,username")
        .eq("id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("deals")
        .select("title,description,city,country")
        .eq("id", app.deal_id)
        .maybeSingle(),
    ]);

    const creatorName =
      creator?.display_name || (creator?.username ? `@${creator.username}` : "creator");
    const businessName = business?.display_name || business?.username || "our team";
    const dealTitle = deal?.title ?? "our offer";
    const code = app.approved_code ?? app.requested_code ?? null;
    const commission = app.commission_pct != null ? Number(app.commission_pct) : null;

    const system =
      `You draft a short, warm reply from a business to a creator who applied to promote one of their deals. ` +
      `Decision: ${data.decision}. ` +
      (data.decision === "approved"
        ? "Confirm approval, share the promo code and commission if present, and end with an encouraging note. "
        : "Decline kindly without giving a harsh reason, leave the door open for future collaborations. ") +
      "Body under 140 words, plain text with \\n line breaks. " +
      "Reply ONLY with JSON: { subject: string, body: string }.";

    const user = [
      `From (business): ${businessName}`,
      `To (creator): ${creatorName}`,
      `Deal: ${dealTitle}${deal?.city ? ` — ${deal.city}` : ""}`,
      deal?.description ? `Deal description: ${deal.description.slice(0, 300)}` : "",
      app.pitch ? `Their pitch: ${app.pitch.slice(0, 600)}` : "",
      data.decision === "approved" && code ? `Promo code to include: ${code}` : "",
      data.decision === "approved" && commission != null
        ? `Commission to include: ${commission}%`
        : "",
      ``,
      `Write the reply as JSON.`,
    ]
      .filter(Boolean)
      .join("\n");

    const draft = await callDraftGateway(system, user);
    if (draft) return draft;
    return fallbackApplicationReply({
      creatorName,
      businessName,
      dealTitle,
      decision: data.decision,
      code,
      commission,
    });
  });
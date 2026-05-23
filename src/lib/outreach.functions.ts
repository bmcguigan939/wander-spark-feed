import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { COMMISSION } from "@/lib/commission";
import { enqueueTransactionalEmail, SITE_URL } from "@/lib/email-send.server";
import { BusinessInviteEmail } from "@/lib/email-templates/business-invite";

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
  followers?: number;
  socialLinksText?: string;
}): Draft {
  const followerLine = args.followers && args.followers > 0
    ? `I share my travel content with ${args.followers.toLocaleString()} followers on Travidz`
    : `I share my travel content`;
  const socialsBlock = args.socialLinksText
    ? `\nYou can check out my work here:\n${args.socialLinksText}\n`
    : ``;
  return {
    subject: `Featured ${args.businessName} on Travidz — claim your listing`,
    body:
      `Hi ${args.businessName} team,\n\n` +
      `I'm ${args.creatorName} — I recently featured you in my Travidz video "${args.videoTitle}" and travellers have been asking how to book directly with you. ${followerLine}, and I'd love to keep promoting you on a commission basis.\n` +
      socialsBlock +
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

    const [{ data: creator }, { data: video }, { count: followerCount }, { data: socials }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("display_name,username")
        .eq("id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("videos")
        .select("title,description,destination,cross_links")
        .eq("id", inv.video_id)
        .maybeSingle(),
      supabaseAdmin
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", userId),
      supabaseAdmin
        .from("profile_socials")
        .select("youtube_handle,youtube_channel_id,tiktok_handle,instagram_handle,x_handle,facebook_handle,website_url,show_social_links")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const creatorName =
      creator?.display_name || (creator?.username ? `@${creator.username}` : "a Travidz creator");
    const inviteUrl = `https://travidz.com/business/invite/${inv.token}`;
    const videoTitle = video?.title ?? "a recent video";

    const followers = followerCount ?? 0;
    const crossLinks = Array.isArray((video as any)?.cross_links) ? (video as any).cross_links : [];
    const crossHandles = crossLinks
      .map((l: any) => l?.platform ? `${l.platform}: ${l.url}` : null)
      .filter(Boolean)
      .join(", ");

    // Build social feed links so the business can review the creator's
    // content directly. Only include when the creator has chosen to show them.
    const socialLinks: { label: string; url: string }[] = [];
    const show = socials?.show_social_links !== false;
    const strip = (h: string) => h.replace(/^@+/, "").trim();
    if (show && socials) {
      if (socials.instagram_handle) socialLinks.push({ label: "Instagram", url: `https://instagram.com/${strip(socials.instagram_handle)}` });
      if (socials.tiktok_handle) socialLinks.push({ label: "TikTok", url: `https://tiktok.com/@${strip(socials.tiktok_handle)}` });
      if (socials.youtube_channel_id) socialLinks.push({ label: "YouTube", url: `https://youtube.com/channel/${socials.youtube_channel_id}` });
      else if (socials.youtube_handle) socialLinks.push({ label: "YouTube", url: `https://youtube.com/@${strip(socials.youtube_handle)}` });
      if (socials.x_handle) socialLinks.push({ label: "X", url: `https://x.com/${strip(socials.x_handle)}` });
      if (socials.facebook_handle) socialLinks.push({ label: "Facebook", url: `https://facebook.com/${strip(socials.facebook_handle)}` });
      if (socials.website_url) socialLinks.push({ label: "Website", url: socials.website_url });
    }
    if (creator?.username) {
      socialLinks.push({ label: "Travidz", url: `https://travidz.com/u/${creator.username}` });
    }
    const socialLinksText = socialLinks.map((l) => `${l.label}: ${l.url}`).join("\n");

    const system =
      "You write warm, concise outreach emails from a travel creator to a local business they featured in a short video. " +
      "Tone: friendly, professional, never salesy or pushy. Mention specific details from the video when helpful. " +
      "Keep the body under 180 words. Content-first pitch: invite the business to check out the creator's work via the social feed links provided, and propose working together on a commission basis through Travidz. Do NOT invent stats. " +
      "If a follower count is provided, you may mention it in one short sentence — otherwise omit. " +
      "Include the social feed links verbatim as a short labelled list (one per line, e.g. 'Instagram: <url>') so the business can click through. " +
      "End with a clear single-line CTA containing the invite URL. " +
      "Reply ONLY with JSON: { subject: string, body: string } where body is plain text with \\n line breaks.";

    const user = [
      `Creator: ${creatorName}`,
      `Business: ${inv.business_name}${inv.city ? ` (${inv.city})` : ""}`,
      `Their website: ${inv.website_url}`,
      `Video title: ${videoTitle}`,
      video?.description ? `Video description: ${video.description.slice(0, 400)}` : "",
      video?.destination ? `Destination: ${video.destination}` : "",
      followers > 0 ? `Creator following on Travidz: ${followers} followers` : "",
      socialLinksText ? `Creator's social feeds (include verbatim as a labelled list):\n${socialLinksText}` : "",
      crossHandles ? `Also posts the same video on: ${crossHandles}` : "",
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
      followers,
      socialLinksText,
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
// ----------------------------------------------------------------------------
// Send invite email via the Travidz transactional queue
// ----------------------------------------------------------------------------

export const sendInviteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        inviteId: z.string().uuid(),
        subject: z.string().min(1).max(200),
        body: z.string().min(20).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: inv, error } = await supabaseAdmin
      .from("business_invites")
      .select("id, creator_id, business_name, contact_email, token")
      .eq("id", data.inviteId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv || inv.creator_id !== userId) throw new Error("Not allowed");
    if (!inv.contact_email) {
      throw new Error("This invite has no contact email");
    }

    const { data: creator } = await supabaseAdmin
      .from("profiles")
      .select("display_name, username")
      .eq("id", userId)
      .maybeSingle();
    const creatorName =
      creator?.display_name ||
      (creator?.username ? `@${creator.username}` : "A Travidz creator");

    const inviteUrl = `${SITE_URL}/business/invite/${inv.token}`;

    const result = await enqueueTransactionalEmail({
      to: inv.contact_email,
      subject: data.subject,
      label: "business-invite",
      idempotencyKey: `business-invite-${inv.id}`,
      react: BusinessInviteEmail({
        businessName: inv.business_name,
        creatorName,
        subject: data.subject,
        bodyText: data.body,
        inviteUrl,
        termsUrl: `${SITE_URL}/legal/business-agreement`,
      }),
    });

    const status = "ok" in result && result.ok
      ? ("skipped" in result && result.skipped ? `skipped:${result.skipped}` : "queued")
      : "failed";

    await supabaseAdmin
      .from("business_invites")
      .update({
        last_sent_at: new Date().toISOString(),
        last_send_status: status,
        last_send_error:
          "ok" in result && !result.ok ? String((result as any).error ?? "unknown") : null,
      })
      .eq("id", inv.id);

    // Append a system message into the conversation thread.
    const { data: thread } = await supabaseAdmin
      .from("business_threads")
      .select("id")
      .eq("invite_id", inv.id)
      .maybeSingle();
    if (thread) {
      await supabaseAdmin.from("business_thread_messages").insert({
        thread_id: thread.id,
        sender_kind: "system",
        body: `Invite email sent to ${inv.contact_email} (${status}).\n\nSubject: ${data.subject}\n\n${data.body}`,
        kind: "invite_sent",
        metadata: { status, subject: data.subject },
      });
      await supabaseAdmin
        .from("business_threads")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", thread.id);
    }

    return { ok: status !== "failed", status };
  });

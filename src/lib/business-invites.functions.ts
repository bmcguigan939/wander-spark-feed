import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { COMMISSION } from "@/lib/commission";

export type InviteStatus = "pending" | "accepted" | "declined" | "expired";

export type BusinessInvite = {
  id: string;
  video_id: string;
  creator_id: string;
  business_name: string;
  website_url: string | null;
  city: string | null;
  contact_email: string;
  contact_phone: string | null;
  existing_business_id: string | null;
  token: string;
  status: InviteStatus;
  expires_at: string;
  commission_pct: number;
  creator_share_pct: number;
  platform_share_pct: number;
  accepted_business_id: string | null;
  accepted_deal_id: string | null;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
};

function genToken() {
  // 32 hex chars, url-safe, unguessable enough for invite links
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const createInput = z.object({
  videoId: z.string().uuid(),
  businessName: z.string().min(1).max(120),
  websiteUrl: z
    .union([z.string().url().max(500), z.literal("")])
    .optional()
    .nullable(),
  city: z.string().max(120).optional().nullable(),
  contactEmail: z.string().email().max(200),
  contactPhone: z.string().max(40).optional().nullable(),
  existingBusinessId: z.string().uuid().optional().nullable(),
});

export const createBusinessInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Verify the creator owns this video.
    const { data: video, error: vErr } = await supabaseAdmin
      .from("videos")
      .select("id, creator_id")
      .eq("id", data.videoId)
      .maybeSingle();
    if (vErr) throw new Error(vErr.message);
    if (!video || video.creator_id !== userId) {
      throw new Error("You can only tag businesses on your own videos");
    }

    const token = genToken();
    const websiteUrl = data.websiteUrl ? data.websiteUrl : null;
    const { data: row, error } = await supabaseAdmin
      .from("business_invites")
      .insert({
        video_id: data.videoId,
        creator_id: userId,
        business_name: data.businessName,
        website_url: websiteUrl,
        city: data.city ?? null,
        contact_email: data.contactEmail.toLowerCase(),
        contact_phone: data.contactPhone ?? null,
        existing_business_id: data.existingBusinessId ?? null,
        token,
        commission_pct: COMMISSION.totalPct,
        creator_share_pct: COMMISSION.creatorPct,
        platform_share_pct: COMMISSION.platformPct,
      })
      .select("id, token")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, token: row.token };
  });

export const listInvitesForVideo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ videoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<BusinessInvite[]> => {
    const { userId } = context;
    const { data: rows, error } = await supabaseAdmin
      .from("business_invites")
      .select("*")
      .eq("video_id", data.videoId)
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows as BusinessInvite[]) ?? [];
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ inviteId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("business_invites")
      .delete()
      .eq("id", data.inviteId)
      .eq("creator_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type InviteLanding = {
  invite: {
    id: string;
    business_name: string;
    website_url: string;
    city: string | null;
    status: InviteStatus;
    expires_at: string;
    commission_pct: number;
  };
  creator: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  video: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    view_count: number;
    like_count: number;
  } | null;
};

export const getInviteByToken = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data }): Promise<InviteLanding> => {
    const { data: invite, error } = await supabaseAdmin
      .from("business_invites")
      .select(
        "id, business_name, website_url, city, status, expires_at, commission_pct, creator_id, video_id",
      )
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) throw new Error("Invite not found");

    const [{ data: creator }, { data: video }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", invite.creator_id)
        .maybeSingle(),
      supabaseAdmin
        .from("videos")
        .select("id, title, thumbnail_url, view_count, like_count")
        .eq("id", invite.video_id)
        .maybeSingle(),
    ]);

    // Auto-mark expired if past the window.
    let status = invite.status as InviteStatus;
    if (status === "pending" && new Date(invite.expires_at) < new Date()) {
      await supabaseAdmin
        .from("business_invites")
        .update({ status: "expired" })
        .eq("id", invite.id);
      status = "expired";
    }

    return {
      invite: {
        id: invite.id,
        business_name: invite.business_name,
        website_url: invite.website_url,
        city: invite.city,
        status,
        expires_at: invite.expires_at,
        commission_pct: Number(invite.commission_pct),
      },
      creator: creator ?? null,
      video: video ?? null,
    };
  });

export const declineInvite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        token: z.string().min(8).max(128),
        reason: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("business_invites")
      .update({ status: "declined", decline_reason: data.reason ?? null })
      .eq("token", data.token)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Accept invite — requires the business to be signed in.
// Creates a deal pointing at their direct website, attaches it to the video,
// auto-approves a deal_application at 5%, and assigns the `business` role.
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: invite, error } = await supabaseAdmin
      .from("business_invites")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "pending") {
      throw new Error(`This invite is ${invite.status}`);
    }
    if (new Date(invite.expires_at) < new Date()) {
      throw new Error("This invite has expired");
    }

    // Ensure the user has the `business` role.
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "business" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );

    // Create a deal pointing at their direct website.
    const { data: deal, error: dErr } = await supabaseAdmin
      .from("deals")
      .insert({
        business_id: userId,
        title: invite.business_name,
        description: `Direct website — featured by @${invite.creator_id.slice(0, 6)} on Travidz`,
        url: invite.website_url,
        city: invite.city,
        source: "invite",
        status: "approved",
        is_active: true,
      })
      .select("id")
      .single();
    if (dErr) throw new Error(dErr.message);

    // Auto-approve a deal_application so the creator earns commission on this deal.
    await supabaseAdmin.from("deal_applications").insert({
      deal_id: deal.id,
      creator_id: invite.creator_id,
      business_id: userId,
      status: "approved",
      commission_pct: invite.commission_pct,
      decided_by: userId,
      decided_at: new Date().toISOString(),
      pitch: `Auto-approved via business invite (${invite.business_name})`,
    });

    // Attach the deal to the video.
    await supabaseAdmin
      .from("video_deals")
      .upsert(
        {
          video_id: invite.video_id,
          deal_id: deal.id,
          attached_by: invite.creator_id,
          position: 0,
        },
        { onConflict: "video_id,deal_id", ignoreDuplicates: true },
      );

    // Mark invite accepted.
    await supabaseAdmin
      .from("business_invites")
      .update({
        status: "accepted",
        accepted_business_id: userId,
        accepted_deal_id: deal.id,
      })
      .eq("id", invite.id);

    return { ok: true, dealId: deal.id };
  });
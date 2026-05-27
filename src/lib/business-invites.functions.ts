import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { COMMISSION } from "@/lib/commission";
import { isSelfHost } from "@/lib/url-guards";

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

    // Open the conversation thread that documents this deal.
    await supabaseAdmin.from("business_threads").insert({
      invite_id: row.id,
      creator_id: userId,
      business_email: data.contactEmail.toLowerCase(),
      business_name: data.businessName,
      subject: `Travidz invite — ${data.businessName}`,
    });

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
    website_url: string | null;
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

    // Append system message to the thread + notify the creator.
    const { data: invite } = await supabaseAdmin
      .from("business_invites")
      .select("id, creator_id")
      .eq("token", data.token)
      .maybeSingle();
    if (invite) {
      const { data: thread } = await supabaseAdmin
        .from("business_threads")
        .select("id")
        .eq("invite_id", invite.id)
        .maybeSingle();
      if (thread) {
        await supabaseAdmin.from("business_thread_messages").insert({
          thread_id: thread.id,
          sender_kind: "system",
          body: data.reason
            ? `Invite declined. Reason: ${data.reason}`
            : "Invite declined.",
          kind: "invite_declined",
          metadata: { reason: data.reason ?? null },
        });
        await supabaseAdmin
          .from("business_threads")
          .update({ status: "declined", last_message_at: new Date().toISOString() })
          .eq("id", thread.id);
      }
      await supabaseAdmin.from("notifications").insert({
        user_id: invite.creator_id,
        actor_id: invite.creator_id,
        type: "business_invite_declined",
      });
    }

    return { ok: true };
  });

// Accept invite — requires the business to be signed in.
// Creates a deal pointing at their direct website, attaches it to the video,
// auto-approves a deal_application at 5%, and assigns the `business` role.
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        token: z.string().min(8).max(128),
        agreementVersion: z.string().max(20).optional(),
        websiteUrl: z.string().url().max(2048).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Tiny helper: every supabase await in this handler benefits from a
    // labelled error so silent generic Postgres failures stop hiding the
    // root cause from the invite-accept UI.
    const step = async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        console.error(`[acceptInvite] step "${label}" failed:`, msg, e);
        throw new Error(`accept: ${label} failed: ${msg}`);
      }
    };

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

    // Guard: the invite is locked to a specific business email. The signed-in
    // user MUST match that email — otherwise a creator who is already logged
    // in (e.g. clicking their own invite link) would claim the business
    // listing under their own account.
    const { data: actorRes, error: actorErr } =
      await supabaseAdmin.auth.admin.getUserById(userId);
    if (actorErr) throw new Error(actorErr.message);
    const actorEmail = (actorRes?.user?.email ?? "").toLowerCase();
    const inviteEmail = (invite.contact_email ?? "").toLowerCase();
    if (!actorEmail || actorEmail !== inviteEmail) {
      throw new Error(
        `This invite was sent to ${inviteEmail}. Please sign out and sign in (or sign up) with that email to accept it.`,
      );
    }

    // Ensure the user has the `business` role.
    await step("assign business role", async () => {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: userId, role: "business" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      if (error) throw error;
    });

    // Resolve the website URL: prefer the business-provided value at accept
    // time, otherwise fall back to whatever the creator entered on the invite.
    // If neither is provided, the business runs a Travidz-hosted store and
    // bookings flow through the on-platform checkout (no external URL).
    const providedUrl = data.websiteUrl ?? invite.website_url ?? null;
    const travidzHosted = !providedUrl;
    if (providedUrl && isSelfHost(providedUrl)) {
      throw new Error(
        "Please enter your own booking website (not a travidz.com URL).",
      );
    }
    // Use a Travidz sentinel URL when there's no external site; the deal
    // page treats self-host URLs as on-platform booking and routes to
    // /book/$dealId instead of opening an external link.
    const resolvedWebsiteUrl = providedUrl ?? "https://travidz.com";

    // If the business overrode the URL, persist it on the invite so the audit
    // trail and any follow-up emails reflect the final destination.
    if (data.websiteUrl && data.websiteUrl !== invite.website_url) {
      await step("update invite website_url", async () => {
        const { error } = await supabaseAdmin
          .from("business_invites")
          .update({ website_url: data.websiteUrl })
          .eq("id", invite.id);
        if (error) throw error;
      });
      invite.website_url = data.websiteUrl;
    }
    const deal = await step("insert deal", async () => {
      const { data: row, error: dErr } = await supabaseAdmin
        .from("deals")
        .insert({
          business_id: userId,
          title: invite.business_name,
          description: travidzHosted
            ? `Travidz-hosted store — featured by @${invite.creator_id.slice(0, 6)} on Travidz`
            : `Direct website — featured by @${invite.creator_id.slice(0, 6)} on Travidz`,
          url: resolvedWebsiteUrl,
          city: invite.city,
          source: "invite",
          status: "approved",
          is_active: true,
        })
        .select("id")
        .single();
      if (dErr) throw dErr;
      return row;
    });

    // Auto-approve a deal_application so the creator earns commission on this deal.
    await step("insert deal_application", async () => {
      const { error } = await supabaseAdmin.from("deal_applications").insert({
        deal_id: deal.id,
        creator_id: invite.creator_id,
        business_id: userId,
        status: "approved",
        commission_pct: invite.commission_pct,
        decided_by: userId,
        decided_at: new Date().toISOString(),
        pitch: `Auto-approved via business invite (${invite.business_name})`,
      });
      if (error) throw error;
    });

    // Attach the deal to the originating video AND every other video by the
    // same creator in the same city, so the auto-surfaced "Book with …" card
    // doesn't depend on the feed's city/country fallback finding a match.
    await step("attach deal to videos", async () => {
      const { data: creatorVideos } = await supabaseAdmin
        .from("videos")
        .select("id, city")
        .eq("creator_id", invite.creator_id);
      const targetVideoIds = new Set<string>([invite.video_id]);
      const inviteCity = (invite.city ?? "").trim().toLowerCase();
      for (const v of (creatorVideos ?? []) as Array<{ id: string; city: string | null }>) {
        if (inviteCity && (v.city ?? "").trim().toLowerCase() === inviteCity) {
          targetVideoIds.add(v.id);
        }
      }
      const rows = Array.from(targetVideoIds).map((vid) => ({
        video_id: vid,
        deal_id: deal.id,
        attached_by: invite.creator_id,
        position: 0,
      }));
      const { error } = await supabaseAdmin
        .from("video_deals")
        .upsert(rows, { onConflict: "video_id,deal_id", ignoreDuplicates: true });
      if (error) throw error;
    });

    // Mark invite accepted.
    await step("mark invite accepted", async () => {
      const { error } = await supabaseAdmin
        .from("business_invites")
        .update({
          status: "accepted",
          accepted_business_id: userId,
          accepted_deal_id: deal.id,
        })
        .eq("id", invite.id);
      if (error) throw error;
    });

    // Update the thread: link the business + deal, append system messages, notify creator.
    const { data: thread } = await supabaseAdmin
      .from("business_threads")
      .select("id")
      .eq("invite_id", invite.id)
      .maybeSingle();
    if (thread) {
      await supabaseAdmin
        .from("business_threads")
        .update({
          business_id: userId,
          deal_id: deal.id,
          status: "accepted",
          last_message_at: new Date().toISOString(),
        })
        .eq("id", thread.id);
      await supabaseAdmin.from("business_thread_messages").insert([
        {
          thread_id: thread.id,
          sender_kind: "system",
          body: `${invite.business_name} accepted the invite and joined Travidz.`,
          kind: "invite_accepted",
        },
        {
          thread_id: thread.id,
          sender_kind: "system",
          body: `Deal is live on the map and in search — ${invite.business_name}.`,
          kind: "deal_attached",
          metadata: { deal_id: deal.id },
        },
      ]);
    }
    await supabaseAdmin.from("notifications").insert({
      user_id: invite.creator_id,
      actor_id: userId,
      type: "business_invite_accepted",
      deal_id: deal.id,
    });

    // Record T&C acceptance for audit trail.
    await supabaseAdmin.from("business_agreement_acceptances").insert({
      user_id: userId,
      invite_id: invite.id,
      agreement_version: data.agreementVersion ?? "v1",
    });

    // Populate business-facing profile fields so the auto-surfaced card
    // on creator feeds has a name, logo, website, and locale.
    await step("populate business profile", async () => {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          business_name: invite.business_name,
          business_website_url: invite.website_url,
          business_city: invite.city ?? null,
        })
        .eq("id", userId);
      if (error) throw error;
    });

    // Auto-create the creator <-> business signing so EVERY video by that
    // creator (now and future) surfaces a "Book with {business}" card,
    // even without a per-video deal row. 11% total, 5.5/5.5 split.
    await step("upsert creator_business_signing", async () => {
      const { error } = await supabaseAdmin
        .from("creator_business_signings")
        .upsert(
          {
            creator_id: invite.creator_id,
            business_id: userId,
            commission_pct: 11,
            creator_share_pct: 5.5,
            platform_share_pct: 5.5,
            agreement_version: data.agreementVersion ?? "v1",
            status: "active",
          },
          { onConflict: "creator_id,business_id", ignoreDuplicates: false },
        );
      if (error) throw error;
    });

    return { ok: true, dealId: deal.id };
  });

// Public — no auth. Given an invite token, returns the recipient email locked
// to the invite and whether a Travidz auth account already exists for it.
// Used by the invite landing page to route to signup vs login.
export const checkInviteAccountState = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ email: string; accountExists: boolean }> => {
    const { data: invite, error } = await supabaseAdmin
      .from("business_invites")
      .select("contact_email")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) throw new Error("Invite not found");

    const email = invite.contact_email.toLowerCase();
    let accountExists = false;
    try {
      const { data: exists } = await supabaseAdmin.rpc("email_has_account", {
        _email: email,
      });
      accountExists = !!exists;
    } catch {
      accountExists = false;
    }
    return { email, accountExists };
  });
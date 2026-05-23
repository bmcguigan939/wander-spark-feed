import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ThreadStatus = "open" | "accepted" | "declined" | "archived";
export type SenderKind = "creator" | "business" | "system";
export type MessageKind =
  | "message"
  | "invite_sent"
  | "invite_accepted"
  | "invite_declined"
  | "deal_attached";

export type ThreadSummary = {
  id: string;
  invite_id: string | null;
  deal_id: string | null;
  creator_id: string;
  business_id: string | null;
  business_email: string;
  business_name: string;
  subject: string | null;
  status: ThreadStatus;
  last_message_at: string;
  created_at: string;
  last_message_preview: string | null;
  invite_token?: string | null;
  creator?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type ThreadMessage = {
  id: string;
  sender_kind: SenderKind;
  sender_user_id: string | null;
  sender_email: string | null;
  body: string;
  kind: MessageKind;
  metadata: any;
  created_at: string;
};

// --- creator side -----------------------------------------------------------

export const listCreatorThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ threads: ThreadSummary[] }> => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("business_threads")
      .select("*, business_invites(token)")
      .eq("creator_id", userId)
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];
    if (rows.length === 0) return { threads: [] };
    const ids = rows.map((r) => r.id);
    const { data: lastMsgs } = await supabaseAdmin
      .from("business_thread_messages")
      .select("thread_id, body, created_at")
      .in("thread_id", ids)
      .order("created_at", { ascending: false });
    const previewMap = new Map<string, string>();
    (lastMsgs ?? []).forEach((m: any) => {
      if (!previewMap.has(m.thread_id)) previewMap.set(m.thread_id, m.body);
    });
    return {
      threads: rows.map((r) => ({
        id: r.id,
        invite_id: r.invite_id,
        deal_id: r.deal_id,
        creator_id: r.creator_id,
        business_id: r.business_id,
        business_email: r.business_email,
        business_name: r.business_name,
        subject: r.subject,
        status: r.status,
        last_message_at: r.last_message_at,
        created_at: r.created_at,
        last_message_preview: previewMap.get(r.id) ?? null,
        invite_token: r.business_invites?.token ?? null,
      })),
    };
  });

export const listBusinessThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ threads: ThreadSummary[] }> => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("business_threads")
      .select("*, creator:profiles!business_threads_creator_id_fkey(id,username,display_name,avatar_url)")
      .eq("business_id", userId)
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (error) {
      // Fallback without alias
      const { data: rows } = await supabaseAdmin
        .from("business_threads")
        .select("*")
        .eq("business_id", userId)
        .order("last_message_at", { ascending: false });
      const creatorIds = Array.from(new Set((rows ?? []).map((r: any) => r.creator_id)));
      const { data: creators } = creatorIds.length
        ? await supabaseAdmin
            .from("profiles")
            .select("id,username,display_name,avatar_url")
            .in("id", creatorIds)
        : { data: [] as any[] };
      const cMap = new Map((creators ?? []).map((c: any) => [c.id, c]));
      return {
        threads: (rows ?? []).map((r: any) => ({
          id: r.id,
          invite_id: r.invite_id,
          deal_id: r.deal_id,
          creator_id: r.creator_id,
          business_id: r.business_id,
          business_email: r.business_email,
          business_name: r.business_name,
          subject: r.subject,
          status: r.status,
          last_message_at: r.last_message_at,
          created_at: r.created_at,
          last_message_preview: null,
          creator: cMap.get(r.creator_id) ?? null,
        })),
      };
    }
    return {
      threads: (data ?? []).map((r: any) => ({
        id: r.id,
        invite_id: r.invite_id,
        deal_id: r.deal_id,
        creator_id: r.creator_id,
        business_id: r.business_id,
        business_email: r.business_email,
        business_name: r.business_name,
        subject: r.subject,
        status: r.status,
        last_message_at: r.last_message_at,
        created_at: r.created_at,
        last_message_preview: null,
        creator: r.creator ?? null,
      })),
    };
  });

async function loadThreadWithMessages(threadId: string, userId: string) {
  const { data: thread, error } = await supabaseAdmin
    .from("business_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!thread) throw new Error("Thread not found");
  if (thread.creator_id !== userId && thread.business_id !== userId) {
    throw new Error("Not allowed");
  }
  const { data: messages } = await supabaseAdmin
    .from("business_thread_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  const [{ data: creator }, { data: business }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id,username,display_name,avatar_url")
      .eq("id", thread.creator_id)
      .maybeSingle(),
    thread.business_id
      ? supabaseAdmin
          .from("profiles")
          .select("id,username,display_name,avatar_url")
          .eq("id", thread.business_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let inviteToken: string | null = null;
  if (thread.invite_id) {
    const { data: inv } = await supabaseAdmin
      .from("business_invites")
      .select("token")
      .eq("id", thread.invite_id)
      .maybeSingle();
    inviteToken = inv?.token ?? null;
  }

  return {
    thread: { ...thread, invite_token: inviteToken } as any,
    messages: (messages ?? []) as ThreadMessage[],
    creator: creator ?? null,
    business: business ?? null,
  };
}

export const getThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ threadId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    return loadThreadWithMessages(data.threadId, context.userId);
  });

export const postThreadMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        threadId: z.string().uuid(),
        body: z.string().min(1).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: thread, error } = await supabaseAdmin
      .from("business_threads")
      .select("id, creator_id, business_id")
      .eq("id", data.threadId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!thread) throw new Error("Thread not found");

    let senderKind: SenderKind;
    let notifyUserId: string;
    if (thread.creator_id === userId) {
      senderKind = "creator";
      notifyUserId = thread.business_id ?? thread.creator_id;
    } else if (thread.business_id === userId) {
      senderKind = "business";
      notifyUserId = thread.creator_id;
    } else {
      throw new Error("Not allowed");
    }

    const { data: msg, error: insErr } = await supabaseAdmin
      .from("business_thread_messages")
      .insert({
        thread_id: data.threadId,
        sender_kind: senderKind,
        sender_user_id: userId,
        body: data.body,
        kind: "message",
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin
      .from("business_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", data.threadId);

    // Notify the other side (skip if business hasn't claimed yet — there's no user to notify).
    if (notifyUserId && notifyUserId !== userId) {
      await supabaseAdmin.from("notifications").insert({
        user_id: notifyUserId,
        actor_id: userId,
        type: "business_thread_message",
      });
    }

    return { ok: true, id: msg.id };
  });

// --- anon business side (via invite token) ---------------------------------

export const getThreadByInviteToken = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin.rpc(
      "get_thread_for_invite",
      { _token: data.token },
    );
    if (error) throw new Error(error.message);
    return result as {
      thread: {
        id: string;
        invite_id: string;
        status: ThreadStatus;
        business_name: string;
        business_email: string;
        subject: string | null;
        created_at: string;
      } | null;
      creator: {
        id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
      } | null;
      messages: ThreadMessage[];
    } | null;
  });

export const postReplyByInviteToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        token: z.string().min(8).max(128),
        body: z.string().min(1).max(4000),
        senderEmail: z.string().email().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin.rpc(
      "post_thread_reply_with_token",
      {
        _token: data.token,
        _body: data.body,
        _sender_email: data.senderEmail ?? undefined,
      },
    );
    if (error) throw new Error(error.message);
    return result as { thread_id: string; message_id: string };
  });
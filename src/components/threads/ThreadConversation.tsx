import { useEffect, useRef, useState } from "react";
import { Loader2, Send, CheckCircle2, XCircle, Mail, Link2 } from "lucide-react";
import type { ThreadMessage, SenderKind, MessageKind, ThreadStatus } from "@/lib/business-threads.functions";

export type ThreadParticipant = {
  id?: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

type Props = {
  thread: {
    id: string;
    status: ThreadStatus | string;
    business_name: string;
    business_email?: string | null;
    subject?: string | null;
    invite_token?: string | null;
    deal_id?: string | null;
  };
  messages: ThreadMessage[];
  creator?: ThreadParticipant | null;
  business?: ThreadParticipant | null;
  viewerKind: "creator" | "business";
  canReply: boolean;
  isPosting?: boolean;
  onSend?: (body: string) => Promise<void> | void;
  emailFieldVisible?: boolean;
  emailValue?: string;
  onEmailChange?: (value: string) => void;
};

function nameOf(p?: ThreadParticipant | null, fallback = "Travidz") {
  return p?.display_name || (p?.username ? `@${p.username}` : fallback);
}

function senderLabel(m: ThreadMessage, creator?: ThreadParticipant | null, business?: ThreadParticipant | null, businessName?: string) {
  if (m.sender_kind === "system") return "Travidz";
  if (m.sender_kind === "creator") return nameOf(creator, "Creator");
  return nameOf(business, businessName || "Business");
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; Icon: any }> = {
    open: { label: "Open", className: "bg-primary/10 text-primary", Icon: Mail },
    accepted: { label: "Accepted", className: "bg-emerald-500/10 text-emerald-600", Icon: CheckCircle2 },
    declined: { label: "Declined", className: "bg-muted text-muted-foreground", Icon: XCircle },
    archived: { label: "Archived", className: "bg-muted text-muted-foreground", Icon: XCircle },
  };
  const v = map[status] ?? map.open;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${v.className}`}>
      <v.Icon className="h-3 w-3" /> {v.label}
    </span>
  );
}

function SystemRow({ m }: { m: ThreadMessage }) {
  const tone: Record<MessageKind, string> = {
    message: "border-border bg-muted/40 text-muted-foreground",
    invite_sent: "border-primary/30 bg-primary/5 text-primary",
    invite_accepted: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    invite_declined: "border-border bg-muted/40 text-muted-foreground",
    deal_attached: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  };
  return (
    <div className={`mx-auto max-w-[90%] rounded-xl border px-3 py-2 text-[11px] ${tone[m.kind] ?? tone.message}`}>
      <div className="whitespace-pre-wrap break-words">{m.body}</div>
      <div className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleString()}</div>
    </div>
  );
}

function MessageBubble({ m, mine, label }: { m: ThreadMessage; mine: boolean; label: string }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-soft ${mine ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
        <div className={`mb-0.5 text-[10px] font-semibold ${mine ? "opacity-80" : "text-muted-foreground"}`}>
          {label} {m.sender_email ? `· ${m.sender_email}` : ""}
        </div>
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.body}</div>
        <div className={`mt-1 text-[10px] ${mine ? "opacity-70" : "text-muted-foreground"}`}>
          {new Date(m.created_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export function ThreadConversation({
  thread,
  messages,
  creator,
  business,
  viewerKind,
  canReply,
  isPosting,
  onSend,
  emailFieldVisible,
  emailValue,
  onEmailChange,
}: Props) {
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!onSend || !body.trim()) return;
    await onSend(body.trim());
    setBody("");
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-card/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-display text-base font-semibold">
              {viewerKind === "creator" ? thread.business_name : nameOf(creator, "Creator")}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {viewerKind === "creator"
                ? thread.business_email
                : `Conversation about ${thread.business_name}`}
            </div>
          </div>
          <StatusBadge status={String(thread.status)} />
        </div>
        {thread.invite_token ? (
          <a
            href={`/business/invite/${thread.invite_token}`}
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary"
          >
            <Link2 className="h-3 w-3" /> View invite link
          </a>
        ) : null}
      </div>

      <div className="space-y-2 px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No messages yet.</p>
        ) : null}
        {messages.map((m) => {
          if (m.sender_kind === "system") return <SystemRow key={m.id} m={m} />;
          const mine = m.sender_kind === viewerKind;
          return (
            <MessageBubble
              key={m.id}
              m={m}
              mine={mine}
              label={senderLabel(m, creator, business, thread.business_name)}
            />
          );
        })}
        <div ref={endRef} />
      </div>

      {canReply && onSend ? (
        <form
          onSubmit={submit}
          className="sticky bottom-0 border-t border-border bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur"
        >
          {emailFieldVisible ? (
            <input
              type="email"
              value={emailValue ?? ""}
              onChange={(e) => onEmailChange?.(e.target.value)}
              placeholder="Your email (optional, so the creator can follow up)"
              maxLength={200}
              className="mb-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary"
            />
          ) : null}
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a message…"
              rows={2}
              maxLength={4000}
              className="flex-1 resize-none rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!body.trim() || isPosting}
              className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
            >
              {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Conversations are saved on Travidz as the official record of this deal.
          </p>
        </form>
      ) : null}
    </div>
  );
}
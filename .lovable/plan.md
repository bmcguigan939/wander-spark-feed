## Goal

Every creator ↔ business interaction gets a persistent, append-only chat thread that documents the deal from invite → reply → accept/decline → ongoing communication. The thread is the legal/audit record: every message is timestamped, attributed to a verified user (or to a verified business email pre-claim), and cannot be edited or deleted.

## How it ties together

- Email replies stay inside Travidz (no inbound mail parsing). The invite email's CTA points at the invite landing page, which is also the thread surface for businesses that haven't claimed yet. After accept, the same thread continues in `/studio/threads/$id` for the creator and `/business/threads/$id` for the business.
- Acceptance keeps existing behavior: `acceptInvite` creates an approved, active `deals` row → it's already featured on the map and in search. The thread now also gets a system message "Deal accepted — listing is live" with a link to the deal.

## Plan

### 1. New tables (one migration)

- `business_threads`
  - `id`, `invite_id` (nullable, FK), `deal_id` (nullable, FK)
  - `creator_id` (FK profiles), `business_id` (nullable FK profiles — set on accept)
  - `business_email` (text, lowercased) — the verified contact email; identifies the business side before they have an account
  - `business_name`, `subject`
  - `status` `'open' | 'accepted' | 'declined' | 'archived'`
  - `last_message_at`, `created_at`, `updated_at`
  - One thread per invite (unique on `invite_id`), and one thread per `(creator_id, business_email)` pair so follow-ups don't fork.

- `business_thread_messages`
  - `id`, `thread_id` (FK), `sender_kind` `'creator'|'business'|'system'`
  - `sender_user_id` (nullable), `sender_email` (nullable)
  - `body` (text, 1–4000), `kind` `'message'|'invite_sent'|'invite_accepted'|'invite_declined'|'deal_attached'`
  - `metadata` jsonb (e.g. deal_id, decline_reason)
  - `created_at`
  - Append-only: no UPDATE, no DELETE policies. This is what makes it "filed as legitimate."

- RLS
  - Creators: read/insert where `thread.creator_id = auth.uid()`.
  - Businesses (claimed): read/insert where `thread.business_id = auth.uid()`.
  - Pre-claim business side uses a SECURITY DEFINER RPC `post_thread_reply_with_token(invite_token, body, sender_email)` that resolves the thread via the invite token — table itself stays locked to anon.
  - Reading the thread anonymously via the invite landing page goes through a SECURITY DEFINER RPC `get_thread_for_invite(invite_token)` that returns messages only for the matching invite.

- Notification enum additions: `business_thread_message`, `business_invite_accepted`, `business_invite_declined`.

### 2. Wiring into existing flows

- `createBusinessInvite` → also creates the `business_threads` row + a `kind='invite_sent'` system message containing the reviewed subject/body that's about to be emailed. The email send is recorded here so the audit trail starts at first contact.
- `sendInviteEmail` (the queued send we previously planned via `enqueueTransactionalEmail`) writes `last_sent_at` / `last_send_status` on the invite, AND appends a system message `kind='invite_sent'` with delivery status into the thread.
- `acceptInvite` → sets `thread.status='accepted'`, `business_id=userId`, links `deal_id`, appends `kind='invite_accepted'` + `kind='deal_attached'` system messages. Sends `business_invite_accepted` notification to the creator.
- `declineInvite` → sets `status='declined'`, appends `kind='invite_declined'` with `metadata.reason`.

### 3. Reply surfaces

- **Business side, pre-claim**: invite landing page (`/business/invite/$token`) gets a "Reply to {creator}" section showing the message history (via `get_thread_for_invite` RPC) plus a reply box. Submitting calls `post_thread_reply_with_token` and creates a `business_thread_message` for the creator's inbox. Sender's email is captured from the invite (no auth needed).
- **Business side, post-claim**: `/business/threads` list + `/business/threads/$id` detail view. Same UI shell as the creator side.
- **Creator side**: `/studio/threads` list (filter: open / accepted / declined / archived) + `/studio/threads/$id` detail. Reply box posts as `sender_kind='creator'`. Each new business message produces a `business_thread_message` notification for the creator.
- Header badges on `/studio` and `/business` show unread thread counts (via `getUnreadCount` extended to include the new notification type).

### 4. Email touch points

- Outbound invite email: branded React Email template (`business-invite.tsx`) via the existing transactional queue from `noreply@travidz.com`. CTA → invite landing page. Per-send reply-to is NOT used — replies happen in-app.
- When the business posts a reply via the invite landing page, the creator gets an in-app notification + (optional) a transactional "New reply from {businessName}" email pointing back to `/studio/threads/$id`.
- When the creator replies in a thread, the business gets a transactional "New reply from {creatorName}" email pointing back to either `/business/threads/$id` (claimed) or the original invite landing page (still pre-claim).

### 5. Map / search confirmation

No new logic needed — `acceptInvite` already creates `deals` with `status='approved'`, `is_active=true`, attached to the source video via `video_deals`. Map (`/map`) and search both surface these. The thread's `deal_id` lets the audit trail link back to the live listing.

### 6. Scope cut for v1

- No inbound email parsing, no SMS, no attachments (we'll allow links pasted into the body).
- No realtime — thread refreshes via TanStack Query on focus + after each post.
- No message editing / deletion ever (this is the legitimacy guarantee).
- No multi-party threads — strictly one creator + one business per thread.

## Open questions

1. Should businesses also get an email on every creator reply, or only the first one (then "you have unread messages on Travidz")? Default: every reply.
2. For pre-claim replies, do you want to require the business to verify the email they came in on (magic link) before their first reply is posted, or accept it on trust because the invite token already implies the contact email is correct? Default: trust the token (matches current accept flow).
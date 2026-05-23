## Reword the business invite email

Shift the tone away from a personal "I'm proposing…" pitch to a clearer explanation of **what Travidz is** and **how the flat 11% commission works**. The creator is introducing the platform, not negotiating their own deal.

### Changes

**`src/lib/outreach.functions.ts`**

1. **Rewrite the AI system prompt** (`draftInviteEmail`) so the gateway produces copy that:
   - Introduces Travidz in one short sentence ("Travidz is a short-video travel platform where creators feature places they love and send bookings directly to the business").
   - Explains the commercial model as a **platform offer**, not a personal proposal: "Travidz charges a flat 11% commission on any bookings sent your way — no setup fee, no monthly cost, you only pay on confirmed sales."
   - Bans phrases like "I'm proposing", "I propose", "I'd like to offer", "performance-based partnership". Frames the creator as the messenger, not the dealmaker.
   - Keeps the warm, concise tone, the social-feed links block, and the single-line invite CTA.

2. **Rewrite `fallbackInviteDraft`** with the same structure so the non-AI path matches:
   ```
   Hi {businessName} team,

   I'm {creatorName} — I recently featured you in my Travidz video
   "{videoTitle}" and travellers have been asking how to book with you directly.

   Travidz is a short-video travel platform where creators share places
   they love and send bookings straight to the business. It costs nothing
   to list — Travidz simply takes a flat 11% commission on any confirmed
   bookings we send your way. No setup fee, no monthly cost.

   {optional: follower line}
   {optional: social links block}

   You can claim your free listing here:
   {inviteUrl}

   Happy to answer any questions.

   Thanks,
   {creatorName}
   ```

3. Keep the `COMMISSION.totalPct` reference so the percentage stays in sync with the rest of the app (currently 11%).

### Out of scope

- The invite landing page (`/business/invite/:token`) and the email template chrome (`business-invite.tsx`) — wording there already references Travidz and the agreement, no change needed.
- The application-reply drafts (`draftApplicationReply`) — different flow, unaffected.

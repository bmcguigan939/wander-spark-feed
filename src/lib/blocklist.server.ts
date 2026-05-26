import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Smart re-signup prevention. Stores SHA-256 hashes of identifying
 * fingerprints from blocked / deleted accounts and checks new signups,
 * business claims, and Stripe onboarding against them.
 *
 * Hard signals (email, phone, bank, stripe_account) → block outright.
 * Soft signals (ip, device, business_name, website) → flag for admin review.
 */

export type BlocklistKind =
  | "email"
  | "phone"
  | "bank"
  | "stripe_account"
  | "ip"
  | "device"
  | "business_name"
  | "website";

const HARD: BlocklistKind[] = ["email", "phone", "bank", "stripe_account"];

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normaliseEmail(email: string): string {
  const e = email.trim().toLowerCase();
  const [local, domain] = e.split("@");
  if (!domain) return e;
  let lp = local.split("+")[0];
  if (domain === "gmail.com" || domain === "googlemail.com") {
    lp = lp.replace(/\./g, "");
  }
  return `${lp}@${domain === "googlemail.com" ? "gmail.com" : domain}`;
}

export function normalisePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export function normaliseHost(url: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function normaliseBusinessName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function fingerprint(kind: BlocklistKind, raw: string): string {
  let v = raw.trim();
  if (!v) return "";
  switch (kind) {
    case "email": v = normaliseEmail(v); break;
    case "phone": v = normalisePhone(v); break;
    case "website": v = normaliseHost(v); break;
    case "business_name": v = normaliseBusinessName(v); break;
    default: v = v.toLowerCase();
  }
  return sha(v);
}

export type Signal = { kind: BlocklistKind; value: string };

export async function addBlockedIdentities(
  signals: Signal[],
  originalUserId: string | null,
  reason: string,
  blockedBy: string | null,
) {
  const rows = signals
    .filter((s) => s.value && s.value.trim().length > 0)
    .map((s) => ({
      kind: s.kind,
      value_hash: fingerprint(s.kind, s.value),
      original_user_id: originalUserId,
      reason,
      blocked_by: blockedBy,
    }))
    .filter((r) => r.value_hash.length > 0);
  if (rows.length === 0) return;
  // upsert so duplicates don't error
  await supabaseAdmin
    .from("blocked_identities")
    .upsert(rows as any, { onConflict: "kind,value_hash", ignoreDuplicates: true });
}

export type BlocklistMatch = {
  hardMatch: { kind: BlocklistKind; originalUserId: string | null; reason: string | null } | null;
  softMatches: { kind: BlocklistKind; originalUserId: string | null; reason: string | null }[];
};

export async function checkBlocklist(signals: Signal[]): Promise<BlocklistMatch> {
  const hashes = signals
    .filter((s) => s.value && s.value.trim().length > 0)
    .map((s) => ({ kind: s.kind, hash: fingerprint(s.kind, s.value) }))
    .filter((s) => s.hash.length > 0);
  if (hashes.length === 0) return { hardMatch: null, softMatches: [] };

  const { data } = await supabaseAdmin
    .from("blocked_identities")
    .select("kind,value_hash,original_user_id,reason")
    .in("value_hash", hashes.map((h) => h.hash));

  const hits = (data ?? []).filter((r: any) =>
    hashes.some((h) => h.kind === r.kind && h.hash === r.value_hash),
  );

  let hardMatch: BlocklistMatch["hardMatch"] = null;
  const softMatches: BlocklistMatch["softMatches"] = [];
  for (const h of hits as any[]) {
    const entry = { kind: h.kind as BlocklistKind, originalUserId: h.original_user_id, reason: h.reason };
    if (HARD.includes(h.kind)) {
      hardMatch = hardMatch ?? entry;
    } else {
      softMatches.push(entry);
    }
  }
  return { hardMatch, softMatches };
}

/**
 * Convenience wrapper to be called from signup / claim / Stripe-onboarding
 * server functions. Throws on hard match; flags the user on soft match.
 */
export async function enforceBlocklistOnSignup(
  userId: string,
  signals: Signal[],
): Promise<{ flagged: boolean; matches: BlocklistMatch }> {
  const matches = await checkBlocklist(signals);
  if (matches.hardMatch) {
    throw new Error("This account cannot be created. Contact support@travidz.com.");
  }
  if (matches.softMatches.length > 0) {
    await (supabaseAdmin.from("profiles") as any)
      .update({
        pending_admin_review: true,
        review_reason: `Matched ${matches.softMatches.map((m) => m.kind).join(", ")} of a previously blocked account`,
        review_match_details: matches.softMatches,
      })
      .eq("id", userId);
    return { flagged: true, matches };
  }
  return { flagged: false, matches };
}

/** Record an IP / device fingerprint for a user (for activity history). */
export async function recordUserSignal(
  userId: string,
  kind: "ip" | "device" | "signup_ip",
  rawValue: string,
) {
  if (!rawValue) return;
  await supabaseAdmin.from("user_signals").insert({
    user_id: userId,
    kind,
    value_hash: sha(rawValue.trim().toLowerCase()),
    raw_value: rawValue.slice(0, 200),
  });
}
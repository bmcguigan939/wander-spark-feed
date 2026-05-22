import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// --- Validators ---

const accountHolder = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Za-z .,'\-&]+$/, "Letters, spaces, and ' - . , & only");

const country = z.string().trim().length(2).toUpperCase();

const sortCode = z.string().regex(/^\d{6}$/, "Sort code must be 6 digits");
const accountNumber = z.string().regex(/^\d{8}$/, "Account number must be 8 digits");

function normaliseIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

function ibanValid(iban: string): boolean {
  if (iban.length < 15 || iban.length > 34) return false;
  if (!/^[A-Z0-9]+$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  // Convert letters to numbers (A=10, ..., Z=35) and compute mod-97.
  let mod = 0;
  for (const ch of rearranged) {
    const n = ch >= "0" && ch <= "9" ? ch.charCodeAt(0) - 48 : ch.charCodeAt(0) - 55;
    if (n < 0 || n > 35) return false;
    mod = (mod * (n > 9 ? 100 : 10) + n) % 97;
  }
  return mod === 1;
}

const iban = z
  .string()
  .transform(normaliseIban)
  .refine(ibanValid, { message: "Invalid IBAN" });

const swiftBic = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, "Invalid SWIFT/BIC");

const saveSchema = z
  .object({
    account_holder: accountHolder,
    country,
    sort_code: sortCode.optional(),
    account_number: accountNumber.optional(),
    iban: iban.optional(),
    swift_bic: swiftBic.optional(),
  })
  .refine(
    (v) => (v.sort_code && v.account_number) || v.iban,
    { message: "Provide GB sort code + account number, or an IBAN" },
  );

// --- Mask helpers ---

type MaskedBank = {
  account_holder: string;
  country: string;
  sort_code_last4: string | null;
  account_last4: string | null;
  iban_last4: string | null;
  swift_bic: string | null;
};

function maskBank(raw: any): MaskedBank | null {
  if (!raw || typeof raw !== "object") return null;
  const last4 = (s?: string | null) => (s && s.length >= 4 ? s.slice(-4) : null);
  return {
    account_holder: String(raw.account_holder ?? ""),
    country: String(raw.country ?? ""),
    sort_code_last4: last4(raw.sort_code),
    account_last4: last4(raw.account_number),
    iban_last4: last4(raw.iban),
    swift_bic: raw.swift_bic ?? null,
  };
}

// --- Server functions ---

export const getMyPayoutMethod = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("payout_method, payout_bank_details_encrypted")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const method = (profile?.payout_method ?? "none") as
      | "none"
      | "manual_bank"
      | "stripe_connect";

    let bank: MaskedBank | null = null;
    if (method === "manual_bank" && profile?.payout_bank_details_encrypted) {
      const { data: decoded, error: decErr } = await supabaseAdmin.rpc(
        "decrypt_bank_details",
        { c: profile.payout_bank_details_encrypted as any },
      );
      if (decErr) throw new Error(decErr.message);
      bank = maskBank(decoded);
    }
    return { payout_method: method, bank };
  });

export const saveBankPayoutMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const payload = {
      account_holder: data.account_holder,
      country: data.country,
      sort_code: data.sort_code ?? null,
      account_number: data.account_number ?? null,
      iban: data.iban ?? null,
      swift_bic: data.swift_bic ?? null,
    };

    const { data: encrypted, error: encErr } = await supabaseAdmin.rpc(
      "encrypt_bank_details",
      { p: payload as any },
    );
    if (encErr) throw new Error(encErr.message);

    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({
        payout_method: "manual_bank",
        payout_bank_details_encrypted: encrypted as any,
      })
      .eq("id", userId);
    if (updErr) throw new Error(updErr.message);

    return { payout_method: "manual_bank" as const, bank: maskBank(payload) };
  });

export const clearPayoutMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        payout_method: "none",
        payout_bank_details_encrypted: null,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin-only: read a business's masked bank summary for support.
export const adminGetBusinessPayout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ businessId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: isAdmin, error: roleErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("payout_method, payout_bank_details_encrypted")
      .eq("id", data.businessId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    let bank: MaskedBank | null = null;
    if (
      profile?.payout_method === "manual_bank" &&
      profile.payout_bank_details_encrypted
    ) {
      const { data: decoded, error: decErr } = await supabaseAdmin.rpc(
        "decrypt_bank_details",
        { c: profile.payout_bank_details_encrypted as any },
      );
      if (decErr) throw new Error(decErr.message);
      bank = maskBank(decoded);
    }
    return {
      payout_method: (profile?.payout_method ?? "none") as
        | "none"
        | "manual_bank"
        | "stripe_connect",
      bank,
    };
  });
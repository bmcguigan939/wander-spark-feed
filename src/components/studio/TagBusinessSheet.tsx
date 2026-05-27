import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Loader2, Sparkles, Copy, Mail, Link2, RefreshCw, ArrowLeft } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createBusinessInvite } from "@/lib/business-invites.functions";
import { draftInviteEmail, sendInviteEmail } from "@/lib/outreach.functions";
import { COMMISSION } from "@/lib/commission";

type Props = {
  videoId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: {
    businessName?: string;
    websiteUrl?: string;
    city?: string;
    suggestionId?: string;
  } | null;
  onCreated?: (inviteId: string) => void;
};

export function TagBusinessSheet({ videoId, open, onOpenChange, initial, onCreated }: Props) {
  const qc = useQueryClient();
  const createFn = useServerFn(createBusinessInvite);
  const draftFn = useServerFn(draftInviteEmail);
  const sendEmailFn = useServerFn(sendInviteEmail);

  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [city, setCity] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [step, setStep] = useState<"details" | "review">("details");
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const storageKey = `travidz:invite-draft:${videoId}`;

  useEffect(() => {
    if (!open) return;
    let hydrated = false;
    try {
      const raw = typeof window !== "undefined" ? sessionStorage.getItem(storageKey) : null;
      if (raw) {
        const s = JSON.parse(raw);
        setStep(s.step ?? "details");
        setInviteId(s.inviteId ?? null);
        setInviteToken(s.inviteToken ?? null);
        setSubject(s.subject ?? "");
        setBody(s.body ?? "");
        setBusinessName(s.businessName ?? initial?.businessName ?? "");
        setWebsiteUrl(s.websiteUrl ?? initial?.websiteUrl ?? "");
        setCity(s.city ?? initial?.city ?? "");
        setContactEmail(s.contactEmail ?? "");
        setContactPhone(s.contactPhone ?? "");
        hydrated = true;
      }
    } catch {}
    if (!hydrated) {
      setStep("details");
      setInviteId(null);
      setInviteToken(null);
      setSubject("");
      setBody("");
      setContactEmail("");
      setContactPhone("");
      setBusinessName(initial?.businessName ?? "");
      setWebsiteUrl(initial?.websiteUrl ?? "");
      setCity(initial?.city ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, storageKey]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          businessName, websiteUrl, city, contactEmail, contactPhone,
          step, inviteId, inviteToken, subject, body,
        })
      );
    } catch {}
  }, [open, storageKey, businessName, websiteUrl, city, contactEmail, contactPhone, step, inviteId, inviteToken, subject, body]);

  function clearDraft() {
    try { sessionStorage.removeItem(storageKey); } catch {}
  }

  const draftM = useMutation({
    mutationFn: (id: string) => draftFn({ data: { inviteId: id } }),
    onSuccess: (d) => {
      setSubject(d.subject);
      setBody(d.body);
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't draft email"),
  });

  const m = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          videoId,
          businessName: businessName.trim(),
          websiteUrl: websiteUrl.trim() || null,
          city: city.trim() || null,
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || null,
        },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["business-invites", videoId] });
      qc.invalidateQueries({ queryKey: ["business-suggestions", videoId] });
      if (onCreated && res?.id) onCreated(res.id);
      if (res?.id) {
        setInviteId(res.id);
        setInviteToken(res.token ?? null);
        setStep("review");
        toast.success("Invite ready — generating email…");
        draftM.mutate(res.id);
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't create invite"),
  });

  const canSubmit =
    businessName.trim().length > 0 && contactEmail.trim().length > 0;

  const inviteUrl = inviteToken
    ? `${typeof window !== "undefined" ? window.location.origin : "https://travidz.com"}/business/invite/${inviteToken}`
    : "";

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast(`Copy this ${label.toLowerCase()}`, { description: text, duration: 8000 });
    }
  }

  const sendM = useMutation({
    mutationFn: async () => {
      if (!inviteId) throw new Error("No invite to send");
      const res = await sendEmailFn({ data: { inviteId, subject, body } });
      if (!res?.ok) throw new Error("Send failed");
      return res;
    },
    onSuccess: () => {
      toast.success(`Invite sent to ${contactEmail}`);
      qc.invalidateQueries({ queryKey: ["business-invites", videoId] });
      clearDraft();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't send"),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-3xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {step === "review" ? (
              <button
                type="button"
                onClick={() => setStep("details")}
                aria-label="Back"
                className="-ml-1 rounded-full p-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <Building2 className="h-4 w-4 text-primary" />
            )}
            {step === "details" ? "Invite a business" : "Review your email"}
          </SheetTitle>
          <SheetDescription>
            {step === "details"
              ? `Invite a business you featured to advertise their direct website on Travidz for a flat ${COMMISSION.totalPct}% commission on sales we send them.`
              : "We drafted an outreach email with your follower count and links to your social feeds so the business can check out your content. Edit anything before sending."}
          </SheetDescription>
        </SheetHeader>

        {step === "details" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit && !m.isPending) m.mutate();
          }}
          className="mt-4 space-y-3 pb-6"
        >
          <Field
            label="Business name"
            value={businessName}
            onChange={setBusinessName}
            placeholder="e.g. Aman Bali"
            maxLength={120}
          />
          <Field
            label="Direct website (optional)"
            value={websiteUrl}
            onChange={setWebsiteUrl}
            placeholder="https://…"
            maxLength={500}
            type="url"
          />
          <Field
            label="City (optional)"
            value={city}
            onChange={setCity}
            placeholder="e.g. Ubud"
            maxLength={120}
          />
          <Field
            label="Contact email"
            value={contactEmail}
            onChange={setContactEmail}
            placeholder="hello@business.com"
            maxLength={200}
            type="email"
          />
          <Field
            label="Contact phone (optional)"
            value={contactPhone}
            onChange={setContactPhone}
            placeholder="+1 555…"
            maxLength={40}
          />

          <button
            type="submit"
            disabled={!canSubmit || m.isPending}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
          >
            {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {m.isPending ? "Creating…" : "Create invite & draft email"}
          </button>
          <p className="text-[11px] leading-snug text-muted-foreground">
            We'll generate a shareable link AND an AI-written outreach email
            (including your follower count and links to your social feeds)
            you can edit and send straight from your mail app.
          </p>
        </form>
        ) : (
        <div className="mt-4 space-y-3 pb-6">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Subject
            </span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={draftM.isPending}
              placeholder={draftM.isPending ? "Drafting…" : ""}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Email body
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={draftM.isPending}
              rows={12}
              placeholder={draftM.isPending ? "Writing your pitch using your audience stats…" : ""}
              className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary disabled:opacity-60"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inviteId && draftM.mutate(inviteId)}
              disabled={!inviteId || draftM.isPending}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${draftM.isPending ? "animate-spin" : ""}`} />
              {draftM.isPending ? "Drafting…" : "Regenerate"}
            </button>
            <button
              type="button"
              onClick={() =>
                copy(
                  inviteUrl
                    ? `${subject}\n\n${body}\n\nApprove your listing: ${inviteUrl}`
                    : `${subject}\n\n${body}`,
                  "Email",
                )
              }
              disabled={!subject && !body}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" /> Copy email
            </button>
            {inviteUrl && (
              <button
                type="button"
                onClick={() => copy(inviteUrl, "Invite link")}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold"
              >
                <Link2 className="h-3.5 w-3.5" /> Copy invite link
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => sendM.mutate()}
            disabled={!subject || !body || !contactEmail || sendM.isPending}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
          >
            {sendM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {sendM.isPending ? "Sending…" : "Send from Travidz"}
          </button>
          <button
            type="button"
            onClick={() => { clearDraft(); onOpenChange(false); }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-2 text-xs font-semibold text-muted-foreground"
          >
            Done
          </button>
          <p className="text-[11px] leading-snug text-muted-foreground">
            We'll send this from noreply@travidz.com. Replies come back to your Travidz Messages so the deal stays documented.
          </p>
        </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
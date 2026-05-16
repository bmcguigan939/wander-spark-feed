import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createBusinessInvite } from "@/lib/business-invites.functions";
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

  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [city, setCity] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    if (open) {
      setBusinessName(initial?.businessName ?? "");
      setWebsiteUrl(initial?.websiteUrl ?? "");
      setCity(initial?.city ?? "");
    }
  }, [open, initial]);

  const m = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          videoId,
          businessName: businessName.trim(),
          websiteUrl: websiteUrl.trim(),
          city: city.trim() || null,
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || null,
        },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["business-invites", videoId] });
      qc.invalidateQueries({ queryKey: ["business-suggestions", videoId] });
      toast.success("Invite created — share the link with them");
      if (onCreated && res?.id) onCreated(res.id);
      setBusinessName("");
      setWebsiteUrl("");
      setCity("");
      setContactEmail("");
      setContactPhone("");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't create invite"),
  });

  const canSubmit =
    businessName.length > 0 && websiteUrl.length > 0 && contactEmail.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Tag a business
          </SheetTitle>
          <SheetDescription>
            Invite a business you featured to advertise their direct website on
            Travidz for a flat {COMMISSION.totalPct}% commission on sales we
            send them.
          </SheetDescription>
        </SheetHeader>

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
            label="Direct website"
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
            {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create invite
          </button>
          <p className="text-[11px] leading-snug text-muted-foreground">
            We'll generate a shareable link. Send it to the business and they
            can claim their listing in one click.
          </p>
        </form>
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
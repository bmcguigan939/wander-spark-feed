import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getCreatorPayoutDetails, upsertCreatorPayoutDetails } from "@/lib/payouts.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Form = {
  account_holder_name: string;
  bank_name: string;
  country: string;
  iban: string;
  sort_code: string;
  account_number: string;
  swift_bic: string;
  tax_id: string;
  payout_email: string;
  notes: string;
};

const empty: Form = {
  account_holder_name: "",
  bank_name: "",
  country: "",
  iban: "",
  sort_code: "",
  account_number: "",
  swift_bic: "",
  tax_id: "",
  payout_email: "",
  notes: "",
};

export function PayoutDetailsForm() {
  const qc = useQueryClient();
  const getFn = useServerFn(getCreatorPayoutDetails);
  const saveFn = useServerFn(upsertCreatorPayoutDetails);
  const { data, isLoading } = useQuery({ queryKey: ["payout-details"], queryFn: () => getFn() });
  const [form, setForm] = useState<Form>(empty);

  useEffect(() => {
    const d = (data as any)?.details;
    if (d) {
      setForm({
        account_holder_name: d.account_holder_name ?? "",
        bank_name: d.bank_name ?? "",
        country: d.country ?? "",
        iban: d.iban ?? "",
        sort_code: d.sort_code ?? "",
        account_number: d.account_number ?? "",
        swift_bic: d.swift_bic ?? "",
        tax_id: d.tax_id ?? "",
        payout_email: d.payout_email ?? "",
        notes: d.notes ?? "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: Object.fromEntries(
          Object.entries(form).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()]),
        ) as any,
      }),
    onSuccess: (r: any) => {
      if (!r.ok) return toast.error(r.error ?? "Failed to save");
      toast.success("Bank details saved");
      qc.invalidateQueries({ queryKey: ["payout-details"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/40 p-4">
      <div>
        <p className="text-sm font-semibold">Payout details</p>
        <p className="text-xs text-muted-foreground">
          We'll send your commission to this account once it clears. Stored securely; admin-only visibility.
        </p>
      </div>
      <Row>
        <Field label="Account holder">
          <Input value={form.account_holder_name} onChange={set("account_holder_name")} />
        </Field>
        <Field label="Country">
          <Input value={form.country} onChange={set("country")} placeholder="GB" />
        </Field>
      </Row>
      <Row>
        <Field label="Bank name">
          <Input value={form.bank_name} onChange={set("bank_name")} />
        </Field>
        <Field label="Payout email">
          <Input value={form.payout_email} onChange={set("payout_email")} type="email" />
        </Field>
      </Row>
      <Row>
        <Field label="IBAN">
          <Input value={form.iban} onChange={set("iban")} />
        </Field>
        <Field label="SWIFT/BIC">
          <Input value={form.swift_bic} onChange={set("swift_bic")} />
        </Field>
      </Row>
      <Row>
        <Field label="Sort code">
          <Input value={form.sort_code} onChange={set("sort_code")} />
        </Field>
        <Field label="Account number">
          <Input value={form.account_number} onChange={set("account_number")} />
        </Field>
      </Row>
      <Field label="Tax ID / VAT">
        <Input value={form.tax_id} onChange={set("tax_id")} />
      </Field>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={set("notes")} rows={2} />
      </Field>
      <Button onClick={() => save.mutate()} disabled={save.isPending} size="sm">
        {save.isPending ? "Saving…" : "Save details"}
      </Button>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
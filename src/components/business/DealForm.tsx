import { useState } from "react";

export type DealFormValues = {
  title: string;
  description?: string;
  url: string;
  image_url?: string;
  destination?: string;
  country?: string;
  city?: string;
  discount_label?: string;
  is_active: boolean;
};

export function DealForm({
  initial,
  submitLabel,
  onSubmit,
  busy,
}: {
  initial?: Partial<DealFormValues>;
  submitLabel: string;
  onSubmit: (values: DealFormValues) => Promise<void> | void;
  busy?: boolean;
}) {
  const [v, setV] = useState<DealFormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    url: initial?.url ?? "",
    image_url: initial?.image_url ?? "",
    destination: initial?.destination ?? "",
    country: initial?.country ?? "",
    city: initial?.city ?? "",
    discount_label: initial?.discount_label ?? "",
    is_active: initial?.is_active ?? true,
  });

  const field = (label: string, key: keyof DealFormValues, type = "text", required = false) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        required={required}
        value={(v[key] as string) ?? ""}
        onChange={(e) => setV({ ...v, [key]: e.target.value })}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(v);
      }}
      className="space-y-3"
    >
      {field("Title", "title", "text", true)}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Description</span>
        <textarea
          value={v.description ?? ""}
          onChange={(e) => setV({ ...v, description: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      {field("Link URL", "url", "url", true)}
      {field("Image URL", "image_url", "url")}
      <div className="grid grid-cols-2 gap-3">
        {field("Country", "country")}
        {field("City", "city")}
      </div>
      {field("Destination label", "destination")}
      {field("Discount label (e.g. -20%)", "discount_label")}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={v.is_active}
          onChange={(e) => setV({ ...v, is_active: e.target.checked })}
        />
        <span>Active</span>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60"
      >
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
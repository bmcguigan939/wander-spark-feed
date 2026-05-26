import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, Loader2, X, MapPin } from "lucide-react";
import { toast } from "sonner";

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
  lat?: number | null;
  lng?: number | null;
  parity_exempt?: boolean;
  parity_exempt_reason?: string | null;
  category?: "stay" | "eat" | "do" | "tour" | "transport" | "other";
  pricing_model?: "commission" | "operator_markup";
  operator_base_price_cents?: number | null;
  operator_site_url?: string | null;
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
    lat: initial?.lat ?? null,
    lng: initial?.lng ?? null,
    parity_exempt: initial?.parity_exempt ?? false,
    parity_exempt_reason: initial?.parity_exempt_reason ?? "",
    category: initial?.category ?? "other",
    pricing_model: initial?.pricing_model ?? "commission",
    operator_base_price_cents: initial?.operator_base_price_cents ?? null,
    operator_site_url: initial?.operator_site_url ?? "",
  });
  const [uploading, setUploading] = useState(false);

  const isActivity = v.category === "do" || v.category === "tour";
  const isOperatorMarkup = isActivity && v.pricing_model === "operator_markup";
  const baseGbp =
    v.operator_base_price_cents != null && v.operator_base_price_cents > 0
      ? v.operator_base_price_cents / 100
      : null;
  const travidzPriceGbp = baseGbp != null ? Math.round(baseGbp * 1.11 * 100) / 100 : null;

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not available");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setV((cur) => ({
          ...cur,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        })),
      (err) => toast.error(err.message),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Not signed in");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("deal-images")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("deal-images").getPublicUrl(path);
      setV((cur) => ({ ...cur, image_url: pub.publicUrl }));
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

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
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Category</span>
        <select
          value={v.category ?? "other"}
          onChange={(e) => setV({ ...v, category: e.target.value as DealFormValues["category"] })}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="stay">Stay (hotel, villa, hostel)</option>
          <option value="eat">Eat (restaurant, cafe, bar)</option>
          <option value="do">Do (activity, spa, experience)</option>
          <option value="tour">Tour (guide, excursion, cruise)</option>
          <option value="transport">Transport (transfer, rental, flight)</option>
          <option value="other">Other</option>
        </select>
      </label>
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
      {isActivity && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Activity pricing</span>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={v.pricing_model === "operator_markup"}
              onChange={(e) =>
                setV({
                  ...v,
                  pricing_model: e.target.checked ? "operator_markup" : "commission",
                })
              }
            />
            <span>
              <span className="font-medium">I'm the operator — list my own activity</span>
              <span className="block text-xs text-muted-foreground">
                Travidz uses your website price as the base and adds an 11% booking fee on
                top. We never compare against your own site — only third-party resellers
                like GetYourGuide and Viator.
              </span>
            </span>
          </label>
          {isOperatorMarkup && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] leading-snug text-amber-700 dark:text-amber-400">
              Operator listings must be bookable through Travidz so we can collect the
              11% fee on top of your price. We'll force <em>Book through Travidz</em>{" "}
              on when you save.
            </div>
          )}
          {isOperatorMarkup && (
            <div className="space-y-2 pt-1">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Your website (will be embedded at signup)
                </span>
                <input
                  type="url"
                  required
                  placeholder="https://your-activity.com"
                  value={v.operator_site_url ?? ""}
                  onChange={(e) => setV({ ...v, operator_site_url: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Your website price (GBP, per person)
                </span>
                <input
                  type="number"
                  min={0}
                  step="1"
                  required
                  placeholder="e.g. 120"
                  value={baseGbp ?? ""}
                  onChange={(e) =>
                    setV({
                      ...v,
                      operator_base_price_cents:
                        e.target.value === "" ? null : Math.round(Number(e.target.value) * 100),
                    })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Travidz price (base + 11%)</span>
                  <span className="font-semibold text-foreground">
                    {travidzPriceGbp != null
                      ? `£${travidzPriceGbp.toFixed(2)}`
                      : "—"}
                  </span>
                </div>
                <div className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  The 11% covers secure checkout, customer support, and the creator
                  commission pool. Other resellers typically charge 25–40% on top.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Cover image</span>
        {v.image_url ? (
          <div className="relative overflow-hidden rounded-xl border border-border">
            <img src={v.image_url} alt="" className="aspect-video w-full object-cover" />
            <button
              type="button"
              onClick={() => setV({ ...v, image_url: "" })}
              className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs text-foreground shadow"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          </div>
        ) : (
          <label className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground hover:border-primary hover:text-primary">
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                Tap to upload (JPG/PNG, ≤5 MB)
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("Country", "country")}
        {field("City", "city")}
      </div>
      {field("Destination label", "destination")}
      {field("Discount label (e.g. -20%)", "discount_label")}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Map location (optional)
          </span>
          <button
            type="button"
            onClick={useMyLocation}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary"
          >
            <MapPin className="h-3 w-3" /> Use my location
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            step="0.000001"
            placeholder="Latitude"
            value={v.lat ?? ""}
            onChange={(e) =>
              setV({ ...v, lat: e.target.value === "" ? null : Number(e.target.value) })
            }
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="number"
            step="0.000001"
            placeholder="Longitude"
            value={v.lng ?? ""}
            onChange={(e) =>
              setV({ ...v, lng: e.target.value === "" ? null : Number(e.target.value) })
            }
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={v.is_active}
          onChange={(e) => setV({ ...v, is_active: e.target.checked })}
        />
        <span>Active</span>
      </label>
      <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={!!v.parity_exempt}
            onChange={(e) =>
              setV({
                ...v,
                parity_exempt: e.target.checked,
                parity_exempt_reason: e.target.checked ? v.parity_exempt_reason : "",
              })
            }
          />
          <span>
            <span className="font-medium">Parity-exempt listing</span>
            <span className="block text-xs text-muted-foreground">
              Skip best-price checks for this listing. Use only when contractually justified
              (members-only rate, packaged inclusion, non-comparable OTA price). A written
              reason is required.
            </span>
          </span>
        </label>
        {v.parity_exempt && (
          <textarea
            value={v.parity_exempt_reason ?? ""}
            onChange={(e) => setV({ ...v, parity_exempt_reason: e.target.value })}
            rows={2}
            required
            minLength={5}
            placeholder="Reason (min 5 chars, visible to Travidz support)"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        )}
      </div>
      <button
        type="submit"
        disabled={busy || uploading}
        className="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60"
      >
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
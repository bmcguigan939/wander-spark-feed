import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Globe, Loader2, ShieldCheck } from "lucide-react";
import {
  getMyOperatorSite,
  updateMyOperatorSite,
} from "@/lib/operator-site.functions";
import { CompetitorUrlsEditor } from "@/components/business/CompetitorUrlsEditor";

export const Route = createFileRoute("/business/onboarding/website")({
  head: () => ({
    meta: [{ title: "Add your business website — Travidz" }],
  }),
  component: WebsiteStepPage,
});

function WebsiteStepPage() {
  const navigate = useNavigate();
  const getFn = useServerFn(getMyOperatorSite);
  const updateFn = useServerFn(updateMyOperatorSite);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-operator-site"],
    queryFn: () => getFn(),
  });

  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.operator_site_url) setUrl(data.operator_site_url);
  }, [data?.operator_site_url]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = url.trim();
    if (trimmed.length < 3) {
      setError("Enter your website URL.");
      return;
    }
    setSaving(true);
    try {
      await updateFn({ data: { operator_site_url: trimmed } });
      await refetch();
      navigate({ to: "/business" });
    } catch (e: any) {
      setError(e?.message ?? "Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 pb-16 pt-10">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <Globe className="h-3.5 w-3.5" /> Business website
      </div>
      <h1 className="mt-2 font-display text-2xl font-semibold leading-tight">
        Add your website URL
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We need your own site so our price-match scanner can{" "}
        <strong className="text-foreground">exclude it</strong> from competitor
        scans. Bookings still happen on Travidz — we never link customers off
        the platform.
      </p>

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-card p-3 text-[12px] leading-snug text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <span>
          Required to publish listings. Without it our scanner could pick up
          your own page as a "competitor" and trigger price-match refunds against
          your own rates.
        </span>
      </div>

      {isLoading ? (
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Website URL
            </label>
            <input
              type="url"
              required
              inputMode="url"
              autoComplete="url"
              placeholder="https://yourshop.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            disabled={saving || url.trim().length < 3}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save and continue
          </button>

          <Link
            to="/business"
            className="block pt-2 text-center text-[12px] text-muted-foreground underline-offset-2 hover:underline"
          >
            Back to dashboard
          </Link>
        </form>
      )}

      <div className="mt-10 border-t border-border pt-6">
        <h2 className="font-display text-lg font-semibold leading-tight">
          Pin your OTA listings <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </h2>
        <p className="mt-1 mb-3 text-xs text-muted-foreground">
          Paste the exact URL of your listing on Booking.com, Expedia, GetYourGuide etc.
          Our scanner uses these for a like-for-like price comparison instead of guessing
          via search. You can skip this and add them later in your dashboard.
        </p>
        <CompetitorUrlsEditor />
      </div>
    </div>
  );
}
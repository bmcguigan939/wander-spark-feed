import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Zap } from "lucide-react";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  getMyCollabDefaults,
  upsertMyCollabDefaults,
  getMyCollabRules,
  upsertMyCollabRules,
  RECOMMENDED_DEFAULTS,
} from "@/lib/collabs.functions";

export const Route = createFileRoute("/business/collabs")({
  head: () => ({ meta: [{ title: "Collab defaults — Travidz" }] }),
  component: CollabSettings,
});

function csv(arr: string[] | null | undefined) {
  return (arr ?? []).join(", ");
}
function parseCsv(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}
function parseLines(s: string): string[] {
  return s.split("\n").map((x) => x.trim()).filter(Boolean);
}

function CollabSettings() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDefaults = useServerFn(getMyCollabDefaults);
  const fetchRules = useServerFn(getMyCollabRules);
  const saveDefaults = useServerFn(upsertMyCollabDefaults);
  const saveRules = useServerFn(upsertMyCollabRules);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  const { data: d } = useQuery({
    queryKey: ["collab-defaults"],
    queryFn: () => fetchDefaults(),
    enabled: !!user && isBusiness,
  });
  const { data: r } = useQuery({
    queryKey: ["collab-rules"],
    queryFn: () => fetchRules(),
    enabled: !!user && isBusiness,
  });

  // Defaults form
  const dv: any = d?.defaults ?? {};
  const [deliverables, setDeliverables] = useState("");
  const [nights, setNights] = useState("");
  const [usage, setUsage] = useState("90");
  const [commission, setCommission] = useState("10");
  const [dos, setDos] = useState("");
  const [donts, setDonts] = useState("");
  const [tags, setTags] = useState("");
  const [mentions, setMentions] = useState("");

  useEffect(() => {
    setDeliverables((dv.default_deliverables ?? []).join("\n"));
    setNights(dv.default_nights != null ? String(dv.default_nights) : "");
    setUsage(String(dv.default_usage_rights_days ?? 90));
    setCommission(String(dv.default_commission_pct ?? 10));
    setDos(dv.brand_dos ?? "");
    setDonts(dv.brand_donts ?? "");
    setTags(csv(dv.required_hashtags));
    setMentions(csv(dv.required_mentions));
  }, [d]);

  const saveDefaultsMut = useMutation({
    mutationFn: () =>
      saveDefaults({
        data: {
          default_deliverables: parseLines(deliverables),
          default_nights: nights ? Number(nights) : null,
          default_usage_rights_days: Number(usage) || 90,
          default_commission_pct: Number(commission) || 10,
          brand_dos: dos || null,
          brand_donts: donts || null,
          required_hashtags: parseCsv(tags),
          required_mentions: parseCsv(mentions),
        } as any,
      }),
    onSuccess: () => {
      toast.success("Defaults saved");
      qc.invalidateQueries({ queryKey: ["collab-defaults"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  function applyRecommended() {
    setDeliverables(RECOMMENDED_DEFAULTS.default_deliverables.join("\n"));
    setUsage(String(RECOMMENDED_DEFAULTS.default_usage_rights_days));
    setCommission(String(RECOMMENDED_DEFAULTS.default_commission_pct));
    setDos(RECOMMENDED_DEFAULTS.brand_dos);
    setDonts(RECOMMENDED_DEFAULTS.brand_donts);
    setTags(RECOMMENDED_DEFAULTS.required_hashtags.join(", "));
  }

  // Rules form
  const rv: any = r?.rules ?? {};
  const [autoOn, setAutoOn] = useState(false);
  const [minFollowers, setMinFollowers] = useState("0");
  const [minGbv, setMinGbv] = useState("0");
  const [powerTier, setPowerTier] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [monthCap, setMonthCap] = useState("");
  const [concurrentCap, setConcurrentCap] = useState("");
  const [manualAbove, setManualAbove] = useState("");

  useEffect(() => {
    setAutoOn(!!rv.auto_accept_enabled);
    setMinFollowers(String(rv.min_followers ?? 0));
    setMinGbv(String((rv.min_rolling_gbv_cents ?? 0) / 100));
    setPowerTier(!!rv.require_power_tier);
    setVerifiedOnly(!!rv.require_verified);
    setMonthCap(rv.max_accepts_per_month != null ? String(rv.max_accepts_per_month) : "");
    setConcurrentCap(rv.max_concurrent_active != null ? String(rv.max_concurrent_active) : "");
    setManualAbove(rv.manual_review_above_followers != null ? String(rv.manual_review_above_followers) : "");
  }, [r]);

  const saveRulesMut = useMutation({
    mutationFn: () =>
      saveRules({
        data: {
          auto_accept_enabled: autoOn,
          min_followers: Number(minFollowers) || 0,
          min_rolling_gbv_cents: Math.round((Number(minGbv) || 0) * 100),
          require_power_tier: powerTier,
          require_verified: verifiedOnly,
          max_accepts_per_month: monthCap ? Number(monthCap) : null,
          max_concurrent_active: concurrentCap ? Number(concurrentCap) : null,
          manual_review_above_followers: manualAbove ? Number(manualAbove) : null,
          blackout_dates: [],
        } as any,
      }),
    onSuccess: () => {
      toast.success("Rules saved");
      qc.invalidateQueries({ queryKey: ["collab-rules"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (!user || !isBusiness) return null;

  return (
    <MobileShell>
      <div className="px-4 pt-6 pb-24">
        <Link to="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="mt-3 text-xl font-semibold">Collab defaults</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Set once. Every creator you accept inherits these terms and gets an auto-generated brief.
        </p>

        <section className="mt-5 rounded-2xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Default terms</h2>
            <Button size="sm" variant="outline" onClick={applyRecommended}>
              <Sparkles className="mr-1 h-3.5 w-3.5" /> Use recommended
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <Label>Deliverables (one per line)</Label>
              <textarea
                value={deliverables}
                onChange={(e) => setDeliverables(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="1 short-form video (15-60s)&#10;3 in-feed photos"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Comp nights</Label>
                <Input value={nights} onChange={(e) => setNights(e.target.value)} type="number" min="0" max="60" placeholder="2" />
              </div>
              <div>
                <Label>Commission %</Label>
                <Input value={commission} onChange={(e) => setCommission(e.target.value)} type="number" min="0" max="100" />
              </div>
              <div className="col-span-2">
                <Label>Usage rights (days)</Label>
                <Input value={usage} onChange={(e) => setUsage(e.target.value)} type="number" min="0" max="3650" />
              </div>
            </div>
            <div>
              <Label>Brand do's</Label>
              <textarea value={dos} onChange={(e) => setDos(e.target.value)} rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <Label>Brand don'ts</Label>
              <textarea value={donts} onChange={(e) => setDonts(e.target.value)} rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <Label>Required hashtags (comma-separated)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#Travidz, #YourBrand" />
            </div>
            <div>
              <Label>Required mentions (comma-separated)</Label>
              <Input value={mentions} onChange={(e) => setMentions(e.target.value)} placeholder="@yourbrand" />
            </div>
            <Button onClick={() => saveDefaultsMut.mutate()} disabled={saveDefaultsMut.isPending} className="w-full">
              {saveDefaultsMut.isPending ? "Saving…" : "Save defaults"}
            </Button>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Auto-accept rules</h2>
            </div>
            <Switch checked={autoOn} onCheckedChange={setAutoOn} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Applications matching every rule below are accepted instantly. Otherwise they wait in your inbox.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label>Min followers</Label>
              <Input value={minFollowers} onChange={(e) => setMinFollowers(e.target.value)} type="number" min="0" />
            </div>
            <div>
              <Label>Min rolling GBV ($)</Label>
              <Input value={minGbv} onChange={(e) => setMinGbv(e.target.value)} type="number" min="0" />
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">Power Tier creators only</span>
              <Switch checked={powerTier} onCheckedChange={setPowerTier} />
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">Verified creators only</span>
              <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
            </div>
            <div>
              <Label>Max accepts / month</Label>
              <Input value={monthCap} onChange={(e) => setMonthCap(e.target.value)} type="number" min="1" placeholder="unlimited" />
            </div>
            <div>
              <Label>Max concurrent active</Label>
              <Input value={concurrentCap} onChange={(e) => setConcurrentCap(e.target.value)} type="number" min="1" placeholder="unlimited" />
            </div>
            <div className="col-span-2">
              <Label>Manual review above N followers</Label>
              <Input value={manualAbove} onChange={(e) => setManualAbove(e.target.value)} type="number" min="0" placeholder="e.g. 250000" />
              <p className="mt-1 text-[11px] text-muted-foreground">Big creators always land in your inbox.</p>
            </div>
          </div>
          <Button onClick={() => saveRulesMut.mutate()} disabled={saveRulesMut.isPending} className="mt-4 w-full">
            {saveRulesMut.isPending ? "Saving…" : "Save rules"}
          </Button>
        </section>
      </div>
    </MobileShell>
  );
}
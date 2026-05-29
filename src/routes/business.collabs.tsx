import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Lock, Zap } from "lucide-react";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  getMyCollabRules,
  upsertMyCollabRules,
  RECOMMENDED_DEFAULTS,
} from "@/lib/collabs.functions";

export const Route = createFileRoute("/business/collabs")({
  head: () => ({ meta: [{ title: "Collab defaults — Travidz" }] }),
  component: CollabSettings,
});

function CollabSettings() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchRules = useServerFn(getMyCollabRules);
  const saveRules = useServerFn(upsertMyCollabRules);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  const { data: r } = useQuery({
    queryKey: ["collab-rules"],
    queryFn: () => fetchRules(),
    enabled: !!user && isBusiness,
  });

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
        <h1 className="mt-3 text-xl font-semibold">Collab terms</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Travidz sets the collab terms below so creators get a consistent experience across every business. You control who you accept using the Auto-accept rules underneath.
        </p>

        <section className="mt-5 rounded-2xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Default terms</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Lock className="h-3 w-3" /> Set by Travidz
            </span>
          </div>
          <div className="mt-3 space-y-4 text-sm">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Deliverables</div>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {RECOMMENDED_DEFAULTS.default_deliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Comp nights</div>
                <div className="mt-1 text-lg font-semibold">2</div>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Usage rights</div>
                <div className="mt-1 text-lg font-semibold">{RECOMMENDED_DEFAULTS.default_usage_rights_days} days</div>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Brand do's</div>
              <p className="mt-1 text-sm text-foreground/90">{RECOMMENDED_DEFAULTS.brand_dos}</p>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Brand don'ts</div>
              <p className="mt-1 text-sm text-foreground/90">{RECOMMENDED_DEFAULTS.brand_donts}</p>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Required hashtags</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {RECOMMENDED_DEFAULTS.required_hashtags.map((t) => (
                  <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{t}</span>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Commission is fixed by Travidz (11%) — it isn't negotiated per collab.
            </p>
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
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  TIER_COLORS,
  TIER_ORDER,
  V6_DEFAULTS,
} from "@/lib/investor-model/assumptions";
import {
  computeCreatorCohorts,
  computeMarket,
  computeRevenue,
  fmtGBP,
  fmtNum,
  fmtPct,
} from "@/lib/investor-model/compute";
import { useInvestorAssumptions } from "@/lib/investor-model/use-assumptions";
import { TIER_LABEL, type CreatorTier } from "@/lib/commission";

export const Route = createFileRoute("/admin/investor")({
  head: () => ({ meta: [{ title: "Investor model — Travidz" }] }),
  component: InvestorModelPage,
});

function InvestorModelPage() {
  const { assumptions, scenario, setScenario, update, reset, scenarios } = useInvestorAssumptions();

  const market = useMemo(() => computeMarket(assumptions), [assumptions]);
  const cohorts = useMemo(() => computeCreatorCohorts(assumptions), [assumptions]);
  const revenue = useMemo(() => computeRevenue(assumptions), [assumptions]);
  const y5 = revenue[revenue.length - 1];

  return (
    <div className="px-4 py-6 pb-28 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Investor model</h2>
          <p className="text-sm text-muted-foreground">
            v6 SOM & TAM with tapered 50 → 40 → 30 commission + power-creator tier. Internal only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-card p-1">
            {(Object.keys(scenarios) as Array<keyof typeof scenarios>).map((id) => (
              <button
                key={id}
                onClick={() => setScenario(id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  scenario === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {scenarios[id].label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>Reset</Button>
        </div>
      </header>

      <HeadlineStrip y5={y5} market={market} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="market">Market (TAM/SAM/SOM)</TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
          <TabsTrigger value="revenue">Revenue & take-rate</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <OverviewPane market={market} revenue={revenue} cohorts={cohorts} />
        </TabsContent>
        <TabsContent value="market" className="space-y-4 pt-4">
          <MarketPane assumptions={assumptions} update={update} market={market} />
        </TabsContent>
        <TabsContent value="creators" className="space-y-4 pt-4">
          <CreatorsPane assumptions={assumptions} update={update} cohorts={cohorts} />
        </TabsContent>
        <TabsContent value="revenue" className="space-y-4 pt-4">
          <RevenuePane assumptions={assumptions} update={update} revenue={revenue} />
        </TabsContent>
        <TabsContent value="scenarios" className="space-y-4 pt-4">
          <ScenariosPane revenue={revenue} scenario={scenario} setScenario={setScenario} scenarios={scenarios} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HeadlineStrip({ y5, market }: { y5: ReturnType<typeof computeRevenue>[number]; market: ReturnType<typeof computeMarket> }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <Stat label="TAM (UK only)" value={fmtGBP(market.tamGBV, { compact: true })} hint={`UK + EU-5: ${fmtGBP(market.tamGBVAll, { compact: true })}`} />
      <Stat label="Year 5 GBV" value={fmtGBP(y5.gbv, { compact: true })} hint={`${fmtPct(y5.gbv / market.samGBV, 2)} of UK SAM`} />
      <Stat label="Year 5 Travidz net" value={fmtGBP(y5.travidzNet, { compact: true })} hint={`take-rate ${fmtPct(y5.blendedTakeRatePct, 2)}`} />
      <Stat
        label="Y5 contribution margin"
        value={fmtGBP(y5.contributionMargin, { compact: true })}
        hint={`after ${fmtGBP(y5.infraTotal, { compact: true })} infra · ${fmtPct(y5.contributionMarginPct, 2)} of GBV`}
      />
      <Stat label="Year 5 creator payout" value={fmtGBP(y5.creatorPayout, { compact: true })} hint={`avg share ${fmtPct(y5.blendedCreatorSharePct, 0)} of net pool`} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function OverviewPane({
  market,
  revenue,
  cohorts,
}: {
  market: ReturnType<typeof computeMarket>;
  revenue: ReturnType<typeof computeRevenue>;
  cohorts: ReturnType<typeof computeCreatorCohorts>;
}) {
  const funnelData = [
    { label: "TAM (UK)", value: market.tamGBV },
    { label: "TAM (UK+EU5)", value: market.tamGBVAll },
    { label: "SAM (UK)", value: market.samGBV },
    { label: "Travidz Y5 GBV", value: revenue[4].gbv },
  ];
  const series = revenue.map((r, i) => ({
    year: `Y${r.year}`,
    GBV: r.gbv,
    "Travidz net": r.travidzNet,
    "Creator payout": r.creatorPayout,
    "Take-rate %": r.blendedTakeRatePct * 100,
    Creators: cohorts[i].activeCreators,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Market funnel (annual GBV)</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tickFormatter={(v) => fmtGBP(v, { compact: true })} stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis type="category" dataKey="label" width={110} stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip formatter={(v: number) => fmtGBP(v, { compact: true })} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">5-year GBV vs Travidz net</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis tickFormatter={(v) => fmtGBP(v, { compact: true })} stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip formatter={(v: number) => fmtGBP(v, { compact: true })} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Creator payout" stackId="a" fill="#22D3EE" />
              <Bar dataKey="Travidz net" stackId="a" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold">Blended take-rate glide path</h3>
        <div className="h-56">
          <ResponsiveContainer>
            <RLineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, "auto"]} />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="Take-rate %" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
            </RLineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4 lg:col-span-2 overflow-x-auto">
        <h3 className="mb-3 text-sm font-semibold">5-year summary</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="py-2">Metric</th>
              {revenue.map((r) => <th key={r.year} className="py-2 text-right">Y{r.year}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <Row label="Active creators" values={cohorts.map((c) => fmtNum(c.activeCreators))} />
            <Row label="GBV" values={revenue.map((r) => fmtGBP(r.gbv, { compact: true }))} />
            <Row label="Gross commission (11%)" values={revenue.map((r) => fmtGBP(r.grossCommission, { compact: true }))} />
            <Row label="Creator payout" values={revenue.map((r) => fmtGBP(r.creatorPayout, { compact: true }))} />
            <Row label="Travidz net" values={revenue.map((r) => fmtGBP(r.travidzNet, { compact: true }))} strong />
            <Row label="Blended take-rate" values={revenue.map((r) => fmtPct(r.blendedTakeRatePct, 2))} />
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Row({ label, values, strong }: { label: string; values: string[]; strong?: boolean }) {
  return (
    <tr className={strong ? "font-semibold" : ""}>
      <td className="py-2">{label}</td>
      {values.map((v, i) => <td key={i} className="py-2 text-right tabular-nums">{v}</td>)}
    </tr>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between text-xs font-medium">
        <span>{label}</span>
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
      <Input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9"
      />
    </label>
  );
}

function PctSlider({
  label,
  value,
  onChange,
  max = 1,
  step = 0.001,
  digits = 2,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
  step?: number;
  digits?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">{fmtPct(value, digits)}</span>
      </div>
      <Slider value={[value]} min={0} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function MarketPane({
  assumptions,
  update,
  market,
}: {
  assumptions: typeof V6_DEFAULTS;
  update: (p: Partial<typeof V6_DEFAULTS>) => void;
  market: ReturnType<typeof computeMarket>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="space-y-4 p-4">
        <h3 className="text-sm font-semibold">TAM / SAM / SOM assumptions (v7 — UK-first)</h3>
        <p className="text-xs text-muted-foreground">
          UK TAM is built from ONS Travel Trends + VisitBritain. SAM = creator-influenced × bookable.
          SOM is bottom-up from the creator funnel — top-down % below is a sanity check only.
          Reconciles to Travidz_Market_Research_TAM_SOM_v7.xlsx.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="UK leisure travellers / year" value={assumptions.tamTravellers} step={1_000_000}
            onChange={(v) => update({ tamTravellers: v })} />
          <NumberField label="Avg trip spend (£)" value={assumptions.avgBookingValue} step={10}
            onChange={(v) => update({ avgBookingValue: v })} />
          <NumberField label="Trips per traveller / year" value={assumptions.bookingsPerTraveller} step={0.1}
            onChange={(v) => update({ bookingsPerTraveller: v })} />
          <NumberField label="EU-5 expansion ×UK TAM" value={assumptions.eu5ExpansionMultiplier} step={0.1}
            onChange={(v) => update({ eu5ExpansionMultiplier: v })} />
          <PctSlider label="SAM as % of TAM (creator-influenced × bookable)" value={assumptions.samPct} onChange={(v) => update({ samPct: v })} />
        </div>
        <div className="space-y-3 pt-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top-down sanity check — implied % of UK SAM by year</div>
          {assumptions.somSharePctByYear.map((v, i) => (
            <PctSlider
              key={i}
              label={`Year ${i + 1}`}
              value={v}
              max={0.1}
              step={0.0001}
              digits={3}
              onChange={(nv) => {
                const next = [...assumptions.somSharePctByYear];
                next[i] = nv;
                update({ somSharePctByYear: next });
              }}
            />
          ))}
        </div>
      </Card>
      <Card className="space-y-3 p-4 lg:sticky lg:top-4 lg:self-start">
        <h3 className="text-sm font-semibold">Live output</h3>
        <KV k="TAM (UK only)" v={fmtGBP(market.tamGBV, { compact: true })} />
        <KV k="TAM (UK + EU-5)" v={fmtGBP(market.tamGBVAll, { compact: true })} />
        <KV k="SAM (UK only)" v={fmtGBP(market.samGBV, { compact: true })} />
        <KV k="SAM (UK + EU-5)" v={fmtGBP(market.samGBVAll, { compact: true })} />
        <div className="border-t border-border pt-2 text-xs font-semibold uppercase text-muted-foreground">SOM bottom-up (creators × GBV)</div>
        {market.somBottomUpGBVByYear.map((v, i) => <KV key={i} k={`Year ${i + 1}`} v={fmtGBP(v, { compact: true })} />)}
        <div className="border-t border-border pt-2 text-xs font-semibold uppercase text-muted-foreground">Top-down ceiling (% of UK SAM)</div>
        {market.somGBVByYear.map((v, i) => <KV key={i} k={`Year ${i + 1}`} v={fmtGBP(v, { compact: true })} />)}
      </Card>
    </div>
  );
}

function CreatorsPane({
  assumptions,
  update,
  cohorts,
}: {
  assumptions: typeof V6_DEFAULTS;
  update: (p: Partial<typeof V6_DEFAULTS>) => void;
  cohorts: ReturnType<typeof computeCreatorCohorts>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="space-y-4 p-4">
        <h3 className="text-sm font-semibold">Creator funnel</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="GBV per active creator / yr (£)" value={assumptions.gbvPerActiveCreator} step={500}
            onChange={(v) => update({ gbvPerActiveCreator: v })} />
          <NumberField label="Founding creator cap" value={assumptions.foundingCap} step={50}
            onChange={(v) => update({ foundingCap: v })} />
          <NumberField label="Power-tier threshold (£ rolling 12mo)" value={assumptions.powerThresholdGBP} step={1000}
            onChange={(v) => update({ powerThresholdGBP: v })} />
        </div>
        <div className="space-y-3 pt-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active creators by year</div>
          {assumptions.creatorsActiveByYear.map((v, i) => (
            <NumberField
              key={i}
              label={`Year ${i + 1}`}
              value={v}
              step={100}
              onChange={(nv) => {
                const next = [...assumptions.creatorsActiveByYear];
                next[i] = nv;
                update({ creatorsActiveByYear: next });
              }}
            />
          ))}
        </div>
      </Card>
      <Card className="space-y-3 p-4 lg:sticky lg:top-4 lg:self-start">
        <h3 className="text-sm font-semibold">Creator mix by year</h3>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={cohorts.map((c) => ({ year: `Y${c.year}`, ...c.creatorsByTier }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis tickFormatter={(v) => fmtNum(v)} stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip formatter={(v: number) => fmtNum(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {TIER_ORDER.map((t) => (
                <Bar key={t} dataKey={t} stackId="a" fill={TIER_COLORS[t]} name={TIER_LABEL[t]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function RevenuePane({
  assumptions,
  update,
  revenue,
}: {
  assumptions: typeof V6_DEFAULTS;
  update: (p: Partial<typeof V6_DEFAULTS>) => void;
  revenue: ReturnType<typeof computeRevenue>;
}) {
  const stackData = revenue.map((r) => ({
    year: `Y${r.year}`,
    ...Object.fromEntries(TIER_ORDER.map((t) => [TIER_LABEL[t], r.gbvByTier[t]])),
  }));
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="space-y-4 p-4">
        <h3 className="text-sm font-semibold">Commission split</h3>
        <PctSlider label="Gross commission (charged to business)" value={assumptions.grossCommissionPct} max={0.2} step={0.005}
          onChange={(v) => update({ grossCommissionPct: v })} />
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Creator share of the net pool by tier</div>
          {TIER_ORDER.map((t) => (
            <PctSlider
              key={t}
              label={TIER_LABEL[t]}
              value={assumptions.creatorSharePctByTier[t]}
              max={1}
              step={0.05}
              digits={0}
              onChange={(v) => update({ creatorSharePctByTier: { ...assumptions.creatorSharePctByTier, [t]: v } })}
            />
          ))}
        </div>
        <div className="pt-3">
          <h4 className="mb-2 text-sm font-semibold">GBV by tier (Y1–Y5)</h4>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={stackData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis tickFormatter={(v) => fmtGBP(v, { compact: true })} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip formatter={(v: number) => fmtGBP(v, { compact: true })} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {TIER_ORDER.map((t) => (
                  <Bar key={t} dataKey={TIER_LABEL[t]} stackId="a">
                    {stackData.map((_, i) => <Cell key={i} fill={TIER_COLORS[t]} />)}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
      <Card className="space-y-3 p-4 lg:sticky lg:top-4 lg:self-start">
        <h3 className="text-sm font-semibold">Year 5</h3>
        {(() => { const r = revenue[4]; return (
          <>
            <KV k="GBV" v={fmtGBP(r.gbv, { compact: true })} />
            <KV k="Gross commission" v={fmtGBP(r.grossCommission, { compact: true })} />
            <KV k="Creator payout" v={fmtGBP(r.creatorPayout, { compact: true })} />
            <KV k="Travidz net" v={fmtGBP(r.travidzNet, { compact: true })} strong />
            <KV k="Blended take-rate" v={fmtPct(r.blendedTakeRatePct, 2)} />
            <KV k="Avg creator share of net pool" v={fmtPct(r.blendedCreatorSharePct, 0)} />
          </>
        ); })()}
      </Card>
    </div>
  );
}

function ScenariosPane({
  revenue,
  scenario,
  setScenario,
  scenarios,
}: {
  revenue: ReturnType<typeof computeRevenue>;
  scenario: string;
  setScenario: (id: any) => void;
  scenarios: ReturnType<typeof useInvestorAssumptions>["scenarios"];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {(Object.keys(scenarios) as Array<keyof typeof scenarios>).map((id) => {
        const active = scenario === id;
        return (
          <Card
            key={id}
            className={`cursor-pointer p-4 transition ${active ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/40"}`}
            onClick={() => setScenario(id)}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">{scenarios[id].label}</h3>
              {active && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">Active</span>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{scenarios[id].description}</p>
            {active && (
              <div className="mt-4 space-y-1.5 text-sm">
                <KV k="Y5 GBV" v={fmtGBP(revenue[4].gbv, { compact: true })} />
                <KV k="Y5 Travidz net" v={fmtGBP(revenue[4].travidzNet, { compact: true })} />
                <KV k="Y5 take-rate" v={fmtPct(revenue[4].blendedTakeRatePct, 2)} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function KV({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={`tabular-nums ${strong ? "font-semibold" : ""}`}>{v}</span>
    </div>
  );
}
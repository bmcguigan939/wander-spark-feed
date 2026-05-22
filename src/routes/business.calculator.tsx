import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { listMyDeals } from "@/lib/deals.functions";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Calculator, TrendingUp, Users, DollarSign } from "lucide-react";

export const Route = createFileRoute("/business/calculator")({
  head: () => ({ meta: [{ title: "Deal Calculator — Travidz" }] }),
  component: CalculatorPage,
});

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function CalculatorPage() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const fetchDeals = useServerFn(listMyDeals);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  const { data } = useQuery({
    queryKey: ["my-deals"],
    queryFn: () => fetchDeals(),
    enabled: !!user && isBusiness,
  });
  const deals = data?.deals ?? [];

  const [clicks, setClicks] = useState(2000);
  const [conversion, setConversion] = useState(3); // %
  const [aov, setAov] = useState(120); // $
  const [commission, setCommission] = useState(11); // % — Travidz flat commission (v6 model)
  const [creators, setCreators] = useState(5);

  const calc = useMemo(() => {
    const conversions = clicks * (conversion / 100);
    const revenue = conversions * aov;
    const creatorPayout = revenue * (commission / 100);
    const netToBusiness = revenue - creatorPayout;
    const perCreator = creators > 0 ? creatorPayout / creators : 0;
    return { conversions, revenue, creatorPayout, netToBusiness, perCreator };
  }, [clicks, conversion, aov, commission, creators]);

  function loadFromDeal(id: string) {
    const d = deals.find((x: any) => x.id === id);
    if (!d) return;
    if (d.click_count) setClicks(d.click_count);
    if (d.price_cents) setAov(Math.round(d.price_cents / 100));
  }

  if (!user || !isBusiness) return null;

  return (
    <MobileShell>
      <div className="px-4 pt-6 pb-28">
        <Link to="/business" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>

        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Deal calculator</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Forecast revenue and creator payouts before you launch.
        </p>

        {deals.length > 0 && (
          <div className="mt-5">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Prefill from deal
            </label>
            <select
              defaultValue=""
              onChange={(e) => e.target.value && loadFromDeal(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="">Manual entry…</option>
              {deals.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.title} · {d.click_count ?? 0} clicks
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-5 space-y-5 rounded-2xl border border-border bg-card p-4">
          <SliderRow label="Monthly clicks" value={clicks} setValue={setClicks} min={0} max={50000} step={100} suffix="" />
          <SliderRow label="Conversion rate" value={conversion} setValue={setConversion} min={0} max={20} step={0.5} suffix="%" />
          <SliderRow label="Average order value" value={aov} setValue={setAov} min={0} max={2000} step={10} prefix="$" />
          <SliderRow label="Travidz commission" value={commission} setValue={setCommission} min={0} max={50} step={1} suffix="%" />
          <SliderRow label="Creators promoting" value={creators} setValue={setCreators} min={1} max={50} step={1} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Stat icon={<Users className="h-3.5 w-3.5" />} label="Bookings / mo" value={fmt(calc.conversions)} />
          <Stat icon={<DollarSign className="h-3.5 w-3.5" />} label="Gross revenue" value={money(calc.revenue)} />
          <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Travidz commission" value={money(calc.creatorPayout)} accent />
          <Stat icon={<DollarSign className="h-3.5 w-3.5" />} label="Net to you" value={money(calc.netToBusiness)} />
        </div>

        <div className="mt-3 rounded-2xl bg-primary/10 p-4 text-sm">
          <div className="text-xs text-muted-foreground">Avg per creator</div>
          <div className="mt-1 text-2xl font-bold text-primary">{money(calc.perCreator)}</div>
          <div className="text-xs text-muted-foreground">per month at this commission</div>
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          Estimates only. Real performance depends on creator audience, seasonality, and offer relevance.
        </p>
      </div>
    </MobileShell>
  );
}

function SliderRow({
  label, value, setValue, min, max, step, prefix, suffix,
}: {
  label: string; value: number; setValue: (n: number) => void;
  min: number; max: number; step: number; prefix?: string; suffix?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => setValue(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
          className="w-24 rounded-md border border-border bg-background px-2 py-0.5 text-right text-sm font-semibold tabular-nums outline-none focus:border-primary"
        />
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        {prefix && <span>{prefix}{min}</span>}
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <span>{prefix}{max}{suffix}</span>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">{icon}{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { V6_DEFAULTS } from "@/lib/investor-model/assumptions";
import { computeMarket, computeRevenue, fmtGBP, fmtPct, fmtNum } from "@/lib/investor-model/compute";
import {
  Download,
  Link as LinkIcon,
  ExternalLink,
  Play,
  Check,
  Sparkles,
  TrendingUp,
  Users,
  Globe2,
  Target,
  Rocket,
  Shield,
} from "lucide-react";

const SHARE_URL = "https://wander-spark-feed.lovable.app/invest";

export const Route = createFileRoute("/invest")({
  head: () => ({
    meta: [
      { title: "Travidz — Investor Pitch" },
      {
        name: "description",
        content:
          "Travidz is a shoppable travel feed. £2.5M SAFE. Creators send the intent; we keep the booking. Experience the product and the pitch.",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Travidz — Investor Pitch" },
      {
        property: "og:description",
        content: "Discover · Book · Earn. The shoppable travel feed. £2.5M SAFE round open.",
      },
      { property: "og:url", content: SHARE_URL },
      { property: "og:type", content: "website" },
    ],
  }),
  component: InvestPage,
});

function InvestPage() {
  const market = useMemo(() => computeMarket(V6_DEFAULTS), []);
  const revenue = useMemo(() => computeRevenue(V6_DEFAULTS), []);
  const y5 = revenue[4];

  return (
    <div className="min-h-screen bg-[#0a0612] text-white">
      <StickyBar />
      <Hero />
      <LiveProduct />
      <ProblemSolution />
      <HowItWorks />
      <BusinessModel />
      <Market market={market} y5={y5} />
      <GrowthPlan />
      <Team />
      <TheAsk />
      <FooterCTA />
    </div>
  );
}

/* ───────── Sticky bar with share + download ───────── */

function StickyBar() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };
  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0612]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#ff5a8a] to-[#ff8e72]" />
          <span className="text-sm font-semibold tracking-tight">Travidz · Investor</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copy}
            className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/10 sm:inline-flex"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <a
            href="/decks/Travidz_Elevator_Pitch_v3.pdf"
            className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/10 md:inline-flex"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </a>
          <a
            href="/decks/Travidz_Elevator_Pitch_v3.pptx"
            className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/10 md:inline-flex"
          >
            <Download className="h-3.5 w-3.5" /> PPTX
          </a>
        </div>
      </div>
    </div>
  );
}

/* ───────── Hero ───────── */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,90,138,0.25),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(255,142,114,0.18),transparent_60%)]" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1.2fr_1fr] md:py-28">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-[#ffb38a]" /> Seed · £2.5M SAFE · Open
          </div>
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Travel discovery has moved to creators.
            <br />
            <span className="bg-gradient-to-r from-[#ff5a8a] via-[#ff8e72] to-[#ffd28a] bg-clip-text text-transparent">
              Booking hasn't.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
            £343B flows through OTAs that pay creators £0 and own the customer. Travidz is the
            shoppable travel feed — creators post the trip, travellers book in two taps, creators
            earn on every booking, for life.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#live"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff5a8a] to-[#ff8e72] px-5 py-3 text-sm font-semibold shadow-xl shadow-[#ff5a8a]/25 transition hover:opacity-90"
            >
              <Play className="h-4 w-4" /> Try the product
            </a>
            <a
              href="/decks/Travidz_Elevator_Pitch_v3.pdf"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              <Download className="h-4 w-4" /> Download deck
            </a>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
            {[
              { k: "TAM", v: "£343B" },
              { k: "Y5 GBV", v: "£444M" },
              { k: "Take", v: "4.65%" },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <dt className="text-[10px] uppercase tracking-wider text-white/50">{s.k}</dt>
                <dd className="mt-1 text-xl font-bold tracking-tight">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative mx-auto hidden h-[520px] w-[260px] rounded-[2.5rem] border border-white/15 bg-gradient-to-b from-[#ff5a8a]/30 to-[#ff8e72]/30 p-2 shadow-2xl shadow-[#ff5a8a]/20 md:block">
          <div className="flex h-full w-full flex-col items-center justify-center rounded-[2rem] bg-[#0a0612] p-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#ff5a8a] to-[#ff8e72]" />
            <p className="mt-6 text-2xl font-bold tracking-tight">Discover.</p>
            <p className="text-2xl font-bold tracking-tight text-white/70">Book.</p>
            <p className="bg-gradient-to-r from-[#ff5a8a] to-[#ffd28a] bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              Earn.
            </p>
            <p className="mt-6 text-xs text-white/40">Scroll for the live product ↓</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Live product embed ───────── */

function LiveProduct() {
  const [iframeFailed, setIframeFailed] = useState(false);
  // detect blocked iframe via timeout
  useEffect(() => {
    const t = setTimeout(() => {
      const f = document.getElementById("live-frame") as HTMLIFrameElement | null;
      try {
        // if cross-origin blocks load event, leave as is
        if (!f) setIframeFailed(true);
      } catch {
        setIframeFailed(true);
      }
    }, 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <section id="live" className="border-b border-white/5 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionLabel icon={<Play className="h-3.5 w-3.5" />}>Experience the product</SectionLabel>
        <div className="mt-4 grid gap-10 md:grid-cols-[1fr_320px] md:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              This is the real app. Tap around.
            </h2>
            <p className="mt-4 max-w-xl text-white/70">
              Below is the live Travidz feed — the same one travellers and creators use today. Open
              it full-screen, swipe through videos, browse deals, check the creator earnings
              calculator. The product is what you're investing in.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Link
                to="/"
                target="_blank"
                className="inline-flex items-center gap-2 rounded-full bg-white text-[#0a0612] px-4 py-2 font-semibold transition hover:bg-white/90"
              >
                <ExternalLink className="h-4 w-4" /> Open full app
              </Link>
              <Link
                to="/deals"
                target="_blank"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-medium text-white/90 transition hover:bg-white/10"
              >
                See deals
              </Link>
              <Link
                to="/map"
                target="_blank"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-medium text-white/90 transition hover:bg-white/10"
              >
                Explore map
              </Link>
              <Link
                to="/creator/calculator"
                target="_blank"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-medium text-white/90 transition hover:bg-white/10"
              >
                Creator calculator
              </Link>
            </div>
          </div>
          <div className="mx-auto w-[300px] shrink-0">
            <div className="rounded-[2.5rem] border border-white/15 bg-white/5 p-2 shadow-2xl shadow-black/40">
              <div className="relative h-[560px] w-full overflow-hidden rounded-[2rem] bg-black">
                {!iframeFailed ? (
                  <iframe
                    id="live-frame"
                    src="/"
                    title="Travidz live preview"
                    className="absolute inset-0 h-full w-full border-0"
                    onError={() => setIframeFailed(true)}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/60">
                    <Play className="h-8 w-8 text-[#ff8e72]" />
                    <p>Preview unavailable inline.</p>
                    <Link
                      to="/"
                      target="_blank"
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0a0612]"
                    >
                      Open in new tab
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Problem / Solution ───────── */

function ProblemSolution() {
  return (
    <section className="border-b border-white/5 py-20">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-2">
        <Card>
          <SectionLabel small icon={<Target className="h-3.5 w-3.5" />}>Problem</SectionLabel>
          <h3 className="mt-3 text-2xl font-bold tracking-tight">
            Creators send the intent. OTAs keep the margin and the data.
          </h3>
          <p className="mt-4 text-white/70">
            Discovery has moved to short-form video — 70%+ of Gen Z plans trips from a feed. Yet
            every booking still flows through Booking, Expedia, Airbnb. £343B transacted; £0 paid
            to the creator who sourced the customer.
          </p>
        </Card>
        <Card highlight>
          <SectionLabel small icon={<Sparkles className="h-3.5 w-3.5" />}>Solution</SectionLabel>
          <h3 className="mt-3 text-2xl font-bold tracking-tight">
            A shoppable travel feed. Booking, native.
          </h3>
          <p className="mt-4 text-white/80">
            Creator posts the trip → traveller books in two taps → creator earns on every booking,
            for life. Unified inventory across stays, tours and experiences. Attribution tracked at
            the ledger, not the cookie.
          </p>
        </Card>
      </div>
    </section>
  );
}

/* ───────── How it works ───────── */

function HowItWorks() {
  const steps = [
    { n: "01", t: "Creator posts", d: "Tag stays, tours and experiences inside the video.", to: "/create" as const },
    { n: "02", t: "Traveller books", d: "Two-tap native checkout. No redirect, no OTA.", to: "/deals" as const },
    { n: "03", t: "Creator earns", d: "30–50% of net commission. Attributed for life.", to: "/creator/calculator" as const },
  ];
  return (
    <section className="border-b border-white/5 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionLabel icon={<Rocket className="h-3.5 w-3.5" />}>How it works</SectionLabel>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Three taps. One ledger.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <Card key={s.n}>
              <div className="text-sm font-mono text-[#ff8e72]">{s.n}</div>
              <h3 className="mt-2 text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-white/65">{s.d}</p>
              <Link
                to={s.to}
                target="_blank"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#ff8e72] hover:underline"
              >
                See it live <ExternalLink className="h-3 w-3" />
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Business model with interactive slider ───────── */

function BusinessModel() {
  const [gbv, setGbv] = useState(100_000_000);
  const net = gbv * 0.0465;
  return (
    <section className="border-b border-white/5 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionLabel icon={<TrendingUp className="h-3.5 w-3.5" />}>Business model</SectionLabel>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          Take rate underwritable, distribution creator-owned.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          <Stat k="Take rate" v="4–7%" sub="Blended Y5: 4.65%" />
          <Stat k="Creator share" v="30–50%" sub="of net commission" />
          <Stat k="Contribution margin" v="~55%" sub="at scale" />
          <Stat k="Paid acquisition" v="£0" sub="Y1–Y2, creator-led" />
        </div>
        <Card className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-white/50">Try the math</div>
              <div className="mt-1 text-sm text-white/70">
                GBV processed: <span className="font-mono text-white">{fmtGBP(gbv, { compact: true })}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-white/50">Travidz net @ 4.65%</div>
              <div className="mt-1 text-2xl font-bold tracking-tight text-[#ff8e72]">
                {fmtGBP(net, { compact: true })}
              </div>
            </div>
          </div>
          <input
            type="range"
            min={10_000_000}
            max={500_000_000}
            step={5_000_000}
            value={gbv}
            onChange={(e) => setGbv(Number(e.target.value))}
            className="mt-4 w-full accent-[#ff5a8a]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-white/40">
            <span>£10M</span>
            <span>£500M</span>
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ───────── Market ───────── */

function Market({ market, y5 }: { market: ReturnType<typeof computeMarket>; y5: ReturnType<typeof computeRevenue>[number] }) {
  return (
    <section className="border-b border-white/5 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionLabel icon={<Globe2 className="h-3.5 w-3.5" />}>Market</SectionLabel>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          Big enough to matter. Defensible to win.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Stat
            k="TAM"
            v={fmtGBP(market.tamGBVAll, { compact: true })}
            sub={`UK ${fmtGBP(market.tamGBV, { compact: true })} · ONS, Eurostat`}
          />
          <Stat
            k="SAM"
            v={fmtGBP(market.samGBVAll, { compact: true })}
            sub="36% creator-influenced × 80% bookable"
          />
          <Stat
            k="Y5 SOM (GBV)"
            v={fmtGBP(y5.gbv, { compact: true })}
            sub={`${fmtGBP(y5.travidzNet, { compact: true })} net @ 4.65% take`}
          />
        </div>
        <Card className="mt-6">
          <div className="mb-3 text-xs uppercase tracking-wider text-white/50">UK SAM penetration by year</div>
          <div className="space-y-2">
            {computeRevenue(V6_DEFAULTS).map((r) => {
              const pct = (r.gbv / market.samGBV) * 100;
              return (
                <div key={r.year} className="flex items-center gap-3 text-xs">
                  <div className="w-12 text-white/60">Y{r.year}</div>
                  <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-[#ff5a8a] to-[#ff8e72]"
                      style={{ width: `${Math.min(pct * 30, 100)}%` }}
                    />
                  </div>
                  <div className="w-32 text-right font-mono text-white/80">
                    {fmtGBP(r.gbv, { compact: true })} · {pct.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ───────── Growth plan ───────── */

function GrowthPlan() {
  const phases = [
    {
      n: "Prove",
      t: "M0–18 · UK",
      kpis: ["2,400 creators", "£44M GBV", "≥3% take", "≥40% M3 retention"],
    },
    {
      n: "Scale",
      t: "M18–44 · EU-5",
      kpis: ["14,000 creators", "£259M GBV", "CAC payback <6mo", "≥4% blended take"],
    },
    {
      n: "Defend",
      t: "M44–60",
      kpis: ["24,000 creators", "£444M GBV", "Creator ledger lock-in", "Supply exclusivity"],
    },
  ];
  return (
    <section className="border-b border-white/5 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionLabel icon={<Shield className="h-3.5 w-3.5" />}>Growth plan</SectionLabel>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Prove → Scale → Defend.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {phases.map((p) => (
            <Card key={p.n}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-bold tracking-tight text-[#ffb38a]">{p.n}</h3>
                <span className="text-xs text-white/50">{p.t}</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                {p.kpis.map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ff5a8a]" />
                    {k}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Team ───────── */

function Team() {
  const team = [
    {
      n: "Brendan McGuigan",
      r: "Co-founder & CEO",
      c: "Co-director of a 6-year construction business · operator who ships on time and on budget · lifelong traveller turning a personal obsession with travel video into a product.",
    },
    {
      n: "Linda McGuigan",
      r: "Co-founder & COO",
      c: "Co-director of a 6-year construction business · runs ops, finance and partnerships · creator-side instinct for travel content that actually converts.",
    },
  ];
  return (
    <section className="border-b border-white/5 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionLabel icon={<Users className="h-3.5 w-3.5" />}>Team</SectionLabel>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Founders who've built and run a business together.</h2>
        <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
          {team.map((m) => (
            <Card key={m.n}>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#ff5a8a] to-[#ff8e72]" />
              <div className="mt-4 text-lg font-semibold">{m.n}</div>
              <div className="text-xs uppercase tracking-wider text-[#ffb38a]">{m.r}</div>
              <div className="mt-2 text-sm text-white/65">{m.c}</div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Ask ───────── */

function TheAsk() {
  const alloc = [
    { k: "GTM", v: 40, c: "from-[#ff5a8a] to-[#ff7a72]" },
    { k: "Eng", v: 35, c: "from-[#ff7a72] to-[#ff8e72]" },
    { k: "Supply", v: 15, c: "from-[#ff8e72] to-[#ffb38a]" },
    { k: "G&A", v: 10, c: "from-[#ffb38a] to-[#ffd28a]" },
  ];
  return (
    <section className="border-b border-white/5 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionLabel icon={<TrendingUp className="h-3.5 w-3.5" />}>The Ask</SectionLabel>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">£2.5M SAFE · 18-month runway.</h2>
        <p className="mt-3 max-w-2xl text-white/70">
          Next: Series A at £18M GBV run-rate. Target KPIs at next round: 8k active creators, £40M
          annualised GBV, 4% blended take.
        </p>
        <Card className="mt-8">
          <div className="mb-3 text-xs uppercase tracking-wider text-white/50">Use of funds</div>
          <div className="flex h-10 w-full overflow-hidden rounded-full border border-white/10">
            {alloc.map((a) => (
              <div
                key={a.k}
                className={`flex items-center justify-center bg-gradient-to-r ${a.c} text-xs font-semibold text-[#0a0612]`}
                style={{ width: `${a.v}%` }}
              >
                {a.k} {a.v}%
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 text-sm text-white/70 md:grid-cols-4">
            <div><b className="text-white">GTM 40%</b> — creator acquisition + 2 EU launches</div>
            <div><b className="text-white">Eng 35%</b> — checkout, ledger, attribution</div>
            <div><b className="text-white">Supply 15%</b> — boutique stays & experiences</div>
            <div><b className="text-white">G&A 10%</b> — finance, legal, ops</div>
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ───────── Footer CTA ───────── */

function FooterCTA() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,90,138,0.25),transparent_60%)]" />
      <div className="relative mx-auto max-w-3xl px-4 text-center">
        <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Let's build the shoppable travel feed.</h2>
        <p className="mt-4 text-white/70">
          15 minutes is enough to walk through the model, the product, and the round.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
          >
            <ExternalLink className="h-4 w-4" /> Explore the live app
          </Link>
        </div>
        <p className="mt-10 text-xs text-white/40">
          {fmtNum(V6_DEFAULTS.creatorsActiveByYear[4])} creators · {fmtPct(V6_DEFAULTS.grossCommissionPct, 0)} gross commission · v8 market model
        </p>
      </div>
    </section>
  );
}

/* ───────── Primitives ───────── */

function SectionLabel({ children, icon, small }: { children: React.ReactNode; icon?: React.ReactNode; small?: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-medium uppercase tracking-wider text-white/70 ${small ? "text-[10px]" : "text-xs"}`}
    >
      {icon}
      {children}
    </div>
  );
}

function Card({ children, className = "", highlight = false }: { children: React.ReactNode; className?: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-3xl border p-6 ${highlight ? "border-[#ff5a8a]/40 bg-gradient-to-br from-[#ff5a8a]/15 to-[#ff8e72]/10" : "border-white/10 bg-white/[0.03]"} ${className}`}
    >
      {children}
    </div>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <Card>
      <div className="text-[10px] uppercase tracking-wider text-white/50">{k}</div>
      <div className="mt-1 text-3xl font-bold tracking-tight">{v}</div>
      {sub && <div className="mt-1 text-xs text-white/55">{sub}</div>}
    </Card>
  );
}
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFoundingSpotsRemaining } from "@/lib/creator-tier.functions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sparkles,
  Video,
  MapPin,
  Wallet,
  CalendarCheck,
  Compass,
  Instagram,
  Music2,
  Youtube,
} from "lucide-react";

const CTA_PRIMARY = "Sign up & start earning";
const CTA_TAGLINE = "Sign up and start earning on your travel posts";

export function LandingPage() {
  const spotsFn = useServerFn(getFoundingSpotsRemaining);
  const { data: spots } = useQuery({
    queryKey: ["founding-spots-remaining"],
    queryFn: () => spotsFn(),
    staleTime: 60_000,
  });

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-background text-foreground">
      <TopBar />
      <Hero spotsRemaining={spots?.remaining} />
      <SocialProof />
      <HowItWorks />
      <SplitAudience />
      <Bento />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-black tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--sunset)] to-[var(--coral)] text-white">
            <Compass className="h-4 w-4" />
          </span>
          travidz
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/download"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-foreground/80 hover:text-foreground sm:inline-flex"
          >
            Get the app
          </Link>
          <Link
            to="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/80 hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            to="/login"
            search={{ mode: "signup" } as never}
            className="rounded-full bg-gradient-to-r from-[var(--sunset)] via-[var(--coral)] to-[var(--twilight)] px-5 py-2 text-sm font-bold text-white shadow-lg shadow-[var(--coral)]/30 transition hover:scale-[1.03]"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero({ spotsRemaining }: { spotsRemaining?: number }) {
  return (
    <section className="relative isolate overflow-hidden px-5 pb-24 pt-16 sm:pt-24">
      {/* colourful blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[var(--sunset)] opacity-40 blur-3xl animate-blob" />
        <div className="absolute right-[-6rem] top-24 h-[24rem] w-[24rem] rounded-full bg-[var(--coral)] opacity-40 blur-3xl animate-blob [animation-delay:-4s]" />
        <div className="absolute bottom-[-8rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-[var(--twilight)] opacity-30 blur-3xl animate-blob [animation-delay:-8s]" />
      </div>

      <div className="mx-auto max-w-5xl text-center">
        {typeof spotsRemaining === "number" && spotsRemaining > 0 && (
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card/70 px-4 py-1.5 text-xs font-semibold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-[var(--coral)]" />
            Only {spotsRemaining} founding creator spots left — lifetime perks
          </div>
        )}

        <h1 className="font-display text-[clamp(2.75rem,7vw,5.5rem)] font-black leading-[0.95] tracking-tight">
          Post travel videos.{" "}
          <span className="bg-gradient-to-r from-[var(--sunset)] via-[var(--coral)] to-[var(--twilight)] bg-clip-text text-transparent">
            Get paid
          </span>{" "}
          when people book.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground/70 sm:text-xl">
          Travidz turns your trip clips into income. Tag the spot, drop the link, and{" "}
          <span className="font-semibold text-foreground">earn commission</span> on every booking.
          No follower minimums. No gatekeepers.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/login"
            search={{ mode: "signup" } as never}
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--sunset)] via-[var(--coral)] to-[var(--twilight)] px-8 py-4 text-base font-bold text-white shadow-xl shadow-[var(--coral)]/40 transition hover:scale-[1.04]"
          >
            {CTA_PRIMARY}
            <span aria-hidden className="transition group-hover:translate-x-1">→</span>
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-foreground/15 bg-card/60 px-7 py-4 text-base font-semibold backdrop-blur hover:bg-card"
          >
            Just here to explore
          </Link>
        </div>

        <p className="mt-5 text-xs uppercase tracking-widest text-foreground/50">
          {CTA_TAGLINE}
        </p>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="border-y border-foreground/10 bg-card/40 py-8">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-5 text-sm font-semibold text-foreground/60">
        <span>Built for creators on</span>
        <span className="inline-flex items-center gap-2"><Music2 className="h-4 w-4" /> TikTok</span>
        <span className="inline-flex items-center gap-2"><Instagram className="h-4 w-4" /> Reels</span>
        <span className="inline-flex items-center gap-2"><Youtube className="h-4 w-4" /> Shorts</span>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Post a video",
      body: "Upload a vertical clip from your last trip. Same vibe as TikTok — under 60 seconds works best.",
      tone: "from-[var(--sunset)] to-[var(--coral)]",
    },
    {
      n: "02",
      title: "Tag the spot",
      body: "Pin the hotel, restaurant, or activity. We auto-link a booking page so viewers can go too.",
      tone: "from-[var(--coral)] to-[var(--twilight)]",
    },
    {
      n: "03",
      title: "Earn 11%",
      body: "Every time someone books through your video, you get paid. Payouts straight to your account.",
      tone: "from-[var(--twilight)] to-[var(--sunset)]",
    },
  ];
  return (
    <section className="px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
          How it works
        </h2>
        <p className="mt-3 max-w-xl text-foreground/70">
          Three steps. No application. No follower count required.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="group relative overflow-hidden rounded-3xl border border-foreground/10 bg-card p-7 transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <div
                className={`absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${s.tone} opacity-30 blur-2xl transition group-hover:opacity-50`}
              />
              <div className="font-display text-5xl font-black text-foreground/15">{s.n}</div>
              <h3 className="mt-4 font-display text-2xl font-bold">{s.title}</h3>
              <p className="mt-2 text-foreground/70">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SplitAudience() {
  return (
    <section className="px-5 py-16">
      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--sunset)] to-[var(--coral)] p-8 text-white">
          <div className="text-5xl">🎥</div>
          <h3 className="mt-4 font-display text-3xl font-black">For creators</h3>
          <p className="mt-2 max-w-sm text-white/90">
            Turn the trip videos you already make into a side income. Keep posting on TikTok — just
            also post here and earn from every booking.
          </p>
          <Link
            to="/login"
            search={{ mode: "signup" } as never}
            className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[var(--twilight)] hover:scale-105 transition"
          >
            Start earning →
          </Link>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--twilight)] to-foreground p-8 text-white">
          <div className="text-5xl">🌍</div>
          <h3 className="mt-4 font-display text-3xl font-black">For travellers</h3>
          <p className="mt-2 max-w-sm text-white/85">
            Stop doomscrolling 50 blog posts. Watch a real video, tap the pin, book the exact spot.
            That's it.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[var(--twilight)] hover:scale-105 transition"
          >
            Explore the feed →
          </Link>
        </div>
      </div>
    </section>
  );
}

function Bento() {
  const tiles = [
    { icon: Video, title: "Real bookings", body: "Tap a video → book the hotel, tour, or table." },
    { icon: MapPin, title: "Map discovery", body: "See every spot on a world map. Plan trips visually." },
    { icon: CalendarCheck, title: "Live calendars", body: "Businesses sync availability — no fake listings." },
    { icon: Wallet, title: "Fast payouts", body: "Earnings track in real time. Withdraw when you want." },
  ];
  return (
    <section className="px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
          Everything in one app
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-3xl border border-foreground/10 bg-card p-6 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--sunset)]/20 to-[var(--coral)]/20 text-[var(--coral)]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
              <p className="mt-1 text-sm text-foreground/70">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "Does it cost anything to join?",
      a: "Nope. Travidz is free for creators and travellers. We only take a cut from businesses when a booking happens.",
    },
    {
      q: "Do I need a big following?",
      a: "Not at all. Even a video with 50 views can earn if someone books from it. No follower gates.",
    },
    {
      q: "How and when do I get paid?",
      a: "You earn commission on every confirmed booking. Earnings show in your dashboard instantly, and payouts are sent at the end of each month for the prior month's confirmed bookings (£20 minimum).",
    },
    {
      q: "What kind of videos work?",
      a: "Vertical clips of hotels, restaurants, activities, viewpoints — anywhere a viewer might want to go. Same energy as your TikToks.",
    },
    {
      q: "Can I still post on TikTok and Reels?",
      a: "Yes please. Travidz is where the booking link lives — keep posting everywhere else too.",
    },
  ];
  return (
    <section className="px-5 py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
          Quick questions
        </h2>
        <Accordion type="single" collapsible className="mt-8">
          {items.map((it, i) => (
            <AccordionItem key={i} value={`q-${i}`} className="border-foreground/10">
              <AccordionTrigger className="text-left font-display text-lg font-bold">
                {it.q}
              </AccordionTrigger>
              <AccordionContent className="text-foreground/75">{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-5 pb-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[var(--sunset)] via-[var(--coral)] to-[var(--twilight)] p-12 text-center text-white sm:p-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
        <h2 className="relative font-display text-4xl font-black sm:text-6xl">
          Your next post could pay you back.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-white/90">
          Join Travidz today. Sign up and start earning on your travel posts.
        </p>
        <Link
          to="/login"
          search={{ mode: "signup" } as never}
          className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[var(--twilight)] shadow-2xl transition hover:scale-105"
        >
          {CTA_PRIMARY} →
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-foreground/10 px-5 py-10 text-sm text-foreground/60">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="font-display text-lg font-black text-foreground">travidz</div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/login">Log in</Link>
          <Link to="/download">Get the app</Link>
          <Link to="/business">For businesses</Link>
          <a href="mailto:support@travidz.com">support@travidz.com</a>
          <Link to="/legal/terms">Terms</Link>
          <Link to="/legal/privacy">Privacy</Link>
        </nav>
        <div>© {new Date().getFullYear()} Travidz</div>
      </div>
    </footer>
  );
}

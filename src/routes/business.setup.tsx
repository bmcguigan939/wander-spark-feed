import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Hotel,
  Home,
  Tent,
  Loader2,
  Search,
  MapPin,
  Plus,
  Minus,
  Bed,
  Mountain,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMySetupState,
  saveSetupBusinessType,
  saveSetupActivityBasics,
  saveSetupActivityLocation,
  saveSetupActivityPricing,
  saveSetupPropertyType,
  saveSetupCount,
  saveSetupOtaListings,
  saveSetupAddress,
  saveSetupChannelManager,
  saveSetupFacilities,
  saveSetupServices,
  saveSetupLanguages,
  saveSetupHostProfile,
  saveSetupBookingModel,
  saveSetupPayments,
  saveSetupPricing,
  saveSetupLegalEntity,
  completeSetup,
  ensureFirstDeal,
  markSetupStepComplete,
} from "@/lib/business-setup.functions";
import { geocodePlace, type GeocodeResult } from "@/lib/map.functions";
import { BusinessPhotosEditor } from "@/components/business/BusinessPhotosEditor";
import { PayoutMethodCard } from "@/components/business/PayoutMethodCard";
import { RoomsAndRatesEditor } from "@/components/business/RoomsAndRatesEditor";
import { DealForm } from "@/components/business/DealForm";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/business/setup")({
  head: () => ({ meta: [{ title: "Set up your property — Travidz" }] }),
  component: BusinessSetupPage,
});

const STAY_TOTAL = 16;
const ACTIVITY_TOTAL = 11;

type Profile = any;
type FirstDeal = any;

function BusinessSetupPage() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchState = useServerFn(getMySetupState);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["business-setup-state"],
    queryFn: () => fetchState(),
    enabled: !!user && isBusiness,
  });

  const businessType = (data?.profile?.setup_business_type as
    | "stay"
    | "activity"
    | null) ?? null;
  const total = businessType === "activity" ? ACTIVITY_TOTAL : STAY_TOTAL;

  // Where the user currently is in the flow. Initialise to the first
  // incomplete step once state loads.
  const [step, setStep] = useState<number>(1);
  const [initialised, setInitialised] = useState(false);
  useEffect(() => {
    if (!initialised && data?.profile) {
      const completed = data.profile.setup_step_completed ?? 0;
      setStep(Math.min(total, Math.max(1, completed + 1)));
      setInitialised(true);
    }
  }, [data, initialised, total]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["business-setup-state"] });
  }

  if (!user || !isBusiness) return null;

  return (
    <MobileShell>
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link to="/business" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {businessType ? `Step ${step} of ${total}` : "Choose your path"}
            </p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${businessType ? (step / total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <Link to="/business" className="text-xs text-muted-foreground">
            Save & exit
          </Link>
        </div>
      </div>

      <div className="px-4 pb-32 pt-5">
        {isLoading || !data ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <StepRouter
            step={step}
            setStep={setStep}
            profile={data.profile}
            firstDeal={data.firstDeal}
            refresh={refresh}
            businessType={businessType}
            total={total}
          />
        )}
      </div>
    </MobileShell>
  );
}

// ---------- step router ----------

function StepRouter({
  step,
  setStep,
  profile,
  firstDeal,
  refresh,
  businessType,
  total,
}: {
  step: number;
  setStep: (n: number) => void;
  profile: Profile;
  firstDeal: FirstDeal | null;
  refresh: () => void;
  businessType: "stay" | "activity" | null;
  total: number;
}) {
  const next = (n?: number) => setStep(n ?? Math.min(total, step + 1));
  const back = () => setStep(Math.max(1, step - 1));
  const common = { profile, firstDeal, next, back, refresh };

  if (!businessType) {
    return <Step0BusinessType {...common} />;
  }

  if (businessType === "activity") {
    switch (step) {
      case 1: return <ActivityStep1Basics {...common} />;
      case 2: return <ActivityStep2Location {...common} />;
      case 3: return <Step8Languages {...common} />;
      case 4: return <Step9HostProfile {...common} />;
      case 5: return <ActivityStep5FirstPackage {...common} />;
      case 6: return <ActivityStep6Photos {...common} />;
      case 7: return <ActivityStep7Pricing {...common} />;
      case 8: return <Step10BookingModel {...common} />;
      case 9: return <Step11Payments {...common} hideAtProperty />;
      case 10: return <Step15LegalEntity {...common} />;
      case 11: return <Step16GoLive {...common} />;
      default: return null;
    }
  }

  switch (step) {
    case 1:
      return <Step1Type {...common} />;
    case 2:
      return <Step2Count {...common} />;
    case 3:
      return <Step3Ota {...common} />;
    case 4:
      return <Step4Address {...common} />;
    case 5:
      return <Step5ChannelManager {...common} />;
    case 6:
      return <Step6Facilities {...common} />;
    case 7:
      return <Step7Services {...common} />;
    case 8:
      return <Step8Languages {...common} />;
    case 9:
      return <Step9HostProfile {...common} />;
    case 10:
      return <Step10BookingModel {...common} />;
    case 11:
      return <Step11Payments {...common} />;
    case 12:
      return <Step12FirstUnit {...common} />;
    case 13:
      return <Step13Photos {...common} />;
    case 14:
      return <Step14Pricing {...common} />;
    case 15:
      return <Step15LegalEntity {...common} />;
    case 16:
      return <Step16GoLive {...common} />;
    default:
      return null;
  }
}

type StepProps = {
  profile: Profile;
  firstDeal: FirstDeal | null;
  next: (n?: number) => void;
  back: () => void;
  refresh: () => void;
};

// ---------- shared UI ----------

function StepTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      {kicker && (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{kicker}</p>
      )}
      <h1 className="mt-1 font-display text-2xl font-semibold leading-tight">{title}</h1>
      {sub && <p className="mt-2 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

function StickyFooter({
  onBack,
  onContinue,
  continueLabel = "Continue",
  disabled,
  busy,
  hideBack,
}: {
  onBack?: () => void;
  onContinue: () => void | Promise<void>;
  continueLabel?: string;
  disabled?: boolean;
  busy?: boolean;
  hideBack?: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center gap-2">
        {!hideBack && (
          <button
            onClick={onBack}
            className="rounded-full border border-border bg-card px-4 py-3 text-sm font-medium"
          >
            Back
          </button>
        )}
        <button
          onClick={() => onContinue()}
          disabled={disabled || busy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {continueLabel}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function Card({ children, onClick, selected }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

// ---------- Step 1: Property type ----------

const PROPERTY_TYPES = [
  {
    key: "apartment" as const,
    label: "Apartment",
    sub: "Furnished, self-catering, guests rent the entire place.",
    icon: Building2,
  },
  {
    key: "home" as const,
    label: "Home",
    sub: "Villas, holiday homes and similar entire-place rentals.",
    icon: Home,
  },
  {
    key: "hotel" as const,
    label: "Hotel, B&B and more",
    sub: "Multi-room properties such as hotels, guest houses and aparthotels.",
    icon: Hotel,
  },
  {
    key: "alternative" as const,
    label: "Alternative places",
    sub: "Boats, campsites, luxury tents and other unique stays.",
    icon: Tent,
  },
];

function Step1Type({ profile, next, refresh }: StepProps) {
  const save = useServerFn(saveSetupPropertyType);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<string | null>(profile?.setup_property_kind ?? null);
  return (
    <>
      <StepTitle
        kicker="Get started"
        title="What kind of property are you listing?"
        sub="We'll tailor the rest of the setup to your property type."
      />
      <div className="space-y-3">
        {PROPERTY_TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.key} onClick={() => setPick(t.key)} selected={pick === t.key}>
              <div className="rounded-xl bg-primary/15 p-2 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.sub}</p>
              </div>
              {pick === t.key && <Check className="h-4 w-4 text-primary" />}
            </Card>
          );
        })}
      </div>
      <StickyFooter
        hideBack
        disabled={!pick}
        busy={busy}
        onContinue={async () => {
          if (!pick) return;
          setBusy(true);
          try {
            await save({ data: { setup_property_kind: pick as any } });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

// ---------- Step 2: Count & layout ----------
function Step2Count({ profile, next, back, refresh }: StepProps) {
  const kind = profile?.setup_property_kind;
  const isHotel = kind === "hotel";
  const save = useServerFn(saveSetupCount);
  const [count, setCount] = useState<number>(profile?.setup_unit_count ?? 1);
  const [sameAddress, setSameAddress] = useState<boolean | null>(
    profile?.setup_units_same_address ?? null
  );
  const [busy, setBusy] = useState(false);
  const isMulti = count > 1;
  const askSameAddress = !isHotel && isMulti;
  const ready = isHotel || !isMulti || sameAddress !== null;
  return (
    <>
      <StepTitle
        title={
          isHotel ? "How many rooms can guests book?" : "How many properties are you listing?"
        }
        sub={
          isHotel
            ? "An approximate room count is fine — you can refine room types later."
            : "You can pick one or several. We'll group them under your account."
        }
      />
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {isHotel ? "Number of rooms" : "Number of properties"}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-8 text-center text-base font-semibold">{count}</span>
            <button
              onClick={() => setCount((c) => Math.min(500, c + 1))}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {askSameAddress && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium">Are these at the same address or building?</p>
          {[
            { v: true, label: "Yes, same address or building" },
            { v: false, label: "No, different addresses" },
          ].map((o) => (
            <Card
              key={String(o.v)}
              onClick={() => setSameAddress(o.v)}
              selected={sameAddress === o.v}
            >
              <div className="min-w-0 flex-1 text-sm font-medium">{o.label}</div>
              {sameAddress === o.v && <Check className="h-4 w-4 text-primary" />}
            </Card>
          ))}
        </div>
      )}

      <StickyFooter
        onBack={back}
        disabled={!ready}
        busy={busy}
        onContinue={async () => {
          setBusy(true);
          try {
            await save({
              data: {
                setup_unit_count: count,
                setup_units_same_address: isMulti && !isHotel ? sameAddress : null,
              },
            });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

// ---------- Step 3: OTA listings ----------
const OTA_OPTIONS = [
  { key: "airbnb", label: "Airbnb" },
  { key: "tripadvisor", label: "TripAdvisor" },
  { key: "vrbo", label: "Vrbo" },
  { key: "expedia", label: "Expedia" },
  { key: "hotels_com", label: "Hotels.com" },
  { key: "booking_com", label: "Booking.com" },
];

function Step3Ota({ profile, next, back, refresh }: StepProps) {
  const save = useServerFn(saveSetupOtaListings);
  const existing = (profile?.ota_listings as any[]) ?? [];
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    existing.forEach((l: any) => (m[l.source] = l.url ?? ""));
    return m;
  });
  const [none, setNone] = useState(existing.length === 0);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <StepTitle
        title="Where else is your property listed?"
        sub="If you list elsewhere we can speed up registration later by importing your details."
      />
      <div className="space-y-2">
        {OTA_OPTIONS.map((o) => {
          const on = o.key in selected;
          return (
            <div key={o.key} className="rounded-2xl border border-border bg-card p-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => {
                    setNone(false);
                    setSelected((s) => {
                      const next = { ...s };
                      if (e.target.checked) next[o.key] = next[o.key] ?? "";
                      else delete next[o.key];
                      return next;
                    });
                  }}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-medium">{o.label}</span>
              </label>
              {on && (
                <input
                  type="url"
                  placeholder="Paste the listing link (optional)"
                  value={selected[o.key]}
                  onChange={(e) =>
                    setSelected((s) => ({ ...s, [o.key]: e.target.value }))
                  }
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              )}
            </div>
          );
        })}
        <Card
          onClick={() => {
            setNone(true);
            setSelected({});
          }}
          selected={none}
        >
          <div className="flex-1 text-sm font-medium">My property isn't listed elsewhere</div>
          {none && <Check className="h-4 w-4 text-primary" />}
        </Card>
      </div>
      <StickyFooter
        onBack={back}
        busy={busy}
        onContinue={async () => {
          setBusy(true);
          try {
            const payload = none
              ? []
              : Object.entries(selected).map(([source, url]) => ({ source: source as any, url }));
            await save({ data: { ota_listings: payload } });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

// ---------- Step 4: Address ----------
function Step4Address({ profile, next, back, refresh }: StepProps) {
  const geocode = useServerFn(geocodePlace);
  const save = useServerFn(saveSetupAddress);
  const [q, setQ] = useState(profile?.address ?? profile?.place_name ?? "");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pick, setPick] = useState<GeocodeResult | null>(
    profile?.lat && profile?.lng
      ? {
          id: "existing",
          place_name: profile.place_name ?? profile.address ?? "",
          text: profile.place_name ?? profile.address ?? "",
          center: [profile.lng, profile.lat],
        }
      : null
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!q.trim() || q === pick?.place_name) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await geocode({ data: { q: q.trim() } });
        setResults(r.results);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <>
      <StepTitle
        title="Where is your property?"
        sub="Start typing your address and pick the best match."
      />
      <div className="relative">
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPick(null);
          }}
          placeholder="Street, city, postal code…"
          className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-3 text-sm outline-none focus:border-primary"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {results.length > 0 && !pick && (
        <ul className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
          {results.map((r) => (
            <li key={r.id}>
              <button
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-primary/5"
                onClick={() => {
                  setPick(r);
                  setQ(r.place_name);
                  setResults([]);
                }}
              >
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span>{r.place_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {pick && (
        <div className="mt-3 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">{pick.place_name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pin: {pick.center[1].toFixed(4)}, {pick.center[0].toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      )}

      <StickyFooter
        onBack={back}
        busy={busy}
        disabled={!pick}
        onContinue={async () => {
          if (!pick) return;
          setBusy(true);
          try {
            // Parse city/country roughly from the place name
            const parts = pick.place_name.split(",").map((s) => s.trim());
            const country = parts[parts.length - 1] ?? null;
            const city = parts.length >= 3 ? parts[parts.length - 3] : parts[0] ?? null;
            await save({
              data: {
                address: pick.place_name,
                place_name: pick.place_name,
                business_city: city,
                business_country: country,
                lat: pick.center[1],
                lng: pick.center[0],
              },
            });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

// ---------- Step 5: Channel manager ----------
function Step5ChannelManager({ profile, next, back, refresh }: StepProps) {
  const save = useServerFn(saveSetupChannelManager);
  const [pick, setPick] = useState<boolean | null>(profile?.channel_manager_planned ?? null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <StepTitle
        title="Do you use a channel manager?"
        sub="A channel manager syncs rates and availability across booking sites. You can connect yours after registration."
      />
      <div className="space-y-3">
        <Card onClick={() => setPick(true)} selected={pick === true}>
          <div className="flex-1 text-sm font-medium">Yes — I'll connect mine later</div>
          {pick === true && <Check className="h-4 w-4 text-primary" />}
        </Card>
        <Card onClick={() => setPick(false)} selected={pick === false}>
          <div className="flex-1 text-sm font-medium">No, I won't use a channel manager</div>
          {pick === false && <Check className="h-4 w-4 text-primary" />}
        </Card>
      </div>
      <StickyFooter
        onBack={back}
        busy={busy}
        disabled={pick === null}
        onContinue={async () => {
          if (pick === null) return;
          setBusy(true);
          try {
            await save({ data: { channel_manager_planned: pick } });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

// ---------- Step 6: Facilities ----------
const FACILITIES = [
  "Free WiFi",
  "Air conditioning",
  "Heating",
  "Swimming pool",
  "Hot tub / jacuzzi",
  "Sauna",
  "Garden",
  "Terrace",
  "Bar",
  "Gym",
  "Pet friendly",
  "Family friendly",
];
function Step6Facilities({ profile, next, back, refresh }: StepProps) {
  const save = useServerFn(saveSetupFacilities);
  const [sel, setSel] = useState<string[]>(profile?.facilities ?? []);
  const [busy, setBusy] = useState(false);
  const toggle = (f: string) =>
    setSel((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]));
  return (
    <>
      <StepTitle
        title="What can guests use at your place?"
        sub="Pick the facilities you offer. You can add more from your dashboard later."
      />
      <div className="flex flex-wrap gap-2">
        {FACILITIES.map((f) => {
          const on = sel.includes(f);
          return (
            <button
              key={f}
              onClick={() => toggle(f)}
              className={`rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              }`}
            >
              {on ? "✓ " : ""}{f}
            </button>
          );
        })}
      </div>
      <StickyFooter
        onBack={back}
        busy={busy}
        onContinue={async () => {
          setBusy(true);
          try {
            await save({ data: { facilities: sel } });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

// ---------- Step 7: Services ----------
function Step7Services({ profile, next, back, refresh }: StepProps) {
  const save = useServerFn(saveSetupServices);
  const [breakfast, setBreakfast] = useState<string | null>(profile?.breakfast_offered ?? null);
  const [parking, setParking] = useState<string | null>(profile?.parking_offered ?? null);
  const [busy, setBusy] = useState(false);

  const Row = ({
    label,
    val,
    set,
    options,
  }: {
    label: string;
    val: string | null;
    set: (v: string) => void;
    options: { v: string; label: string }[];
  }) => (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => set(o.v)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              val === o.v
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <StepTitle title="Services at your property" />
      <div className="space-y-3">
        <Row
          label="Do you serve breakfast?"
          val={breakfast}
          set={setBreakfast}
          options={[
            { v: "no", label: "No" },
            { v: "yes_free", label: "Yes, included" },
            { v: "yes_paid", label: "Yes, paid" },
          ]}
        />
        <Row
          label="Is parking available?"
          val={parking}
          set={setParking}
          options={[
            { v: "no", label: "No" },
            { v: "yes_free", label: "Yes, free" },
            { v: "yes_paid", label: "Yes, paid" },
          ]}
        />
      </div>
      <StickyFooter
        onBack={back}
        busy={busy}
        disabled={!breakfast || !parking}
        onContinue={async () => {
          if (!breakfast || !parking) return;
          setBusy(true);
          try {
            await save({
              data: {
                breakfast_offered: breakfast as any,
                parking_offered: parking as any,
              },
            });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

// ---------- Step 8: Languages ----------
const LANGUAGES = [
  "English",
  "French",
  "Spanish",
  "German",
  "Italian",
  "Portuguese",
  "Dutch",
  "Arabic",
  "Mandarin",
  "Japanese",
];
function Step8Languages({ profile, next, back, refresh }: StepProps) {
  const save = useServerFn(saveSetupLanguages);
  const [sel, setSel] = useState<string[]>(profile?.languages_spoken ?? ["English"]);
  const [busy, setBusy] = useState(false);
  const toggle = (l: string) =>
    setSel((s) => (s.includes(l) ? s.filter((x) => x !== l) : [...s, l]));
  return (
    <>
      <StepTitle title="What languages do you or your staff speak?" />
      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map((l) => {
          const on = sel.includes(l);
          return (
            <button
              key={l}
              onClick={() => toggle(l)}
              className={`rounded-full border px-3.5 py-2 text-xs font-medium ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card"
              }`}
            >
              {on ? "✓ " : ""}{l}
            </button>
          );
        })}
      </div>
      <StickyFooter
        onBack={back}
        busy={busy}
        disabled={sel.length === 0}
        onContinue={async () => {
          setBusy(true);
          try {
            await save({ data: { languages_spoken: sel } });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

// ---------- Step 9: Host profile ----------
function Step9HostProfile({ profile, next, back, refresh }: StepProps) {
  const save = useServerFn(saveSetupHostProfile);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [nbh, setNbh] = useState(profile?.neighbourhood_blurb ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <StepTitle
        title="Host profile"
        sub="Tell potential guests a little about yourself, your property and your neighbourhood."
      />
      <div className="space-y-3">
        <Field label="Display name" hint="Shown on your listing">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </Field>
        <Field label="About you" hint={`${bio.length}/1200`}>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={1200}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </Field>
        <Field label="About the neighbourhood" hint={`${nbh.length}/1200`}>
          <textarea
            rows={4}
            value={nbh}
            onChange={(e) => setNbh(e.target.value)}
            maxLength={1200}
            placeholder="What's the area like? What's nearby?"
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </Field>
      </div>
      <StickyFooter
        onBack={back}
        busy={busy}
        disabled={!name.trim()}
        onContinue={async () => {
          setBusy(true);
          try {
            await save({
              data: {
                display_name: name.trim(),
                bio: bio.trim() || null,
                neighbourhood_blurb: nbh.trim() || null,
              },
            });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ---------- Step 10: Booking model ----------
function Step10BookingModel({ profile, next, back, refresh }: StepProps) {
  const save = useServerFn(saveSetupBookingModel);
  const [pick, setPick] = useState<string | null>(profile?.default_booking_model ?? "instant");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <StepTitle
        title="How can guests book?"
        sub="You can change this for individual listings later."
      />
      <div className="space-y-3">
        <Card onClick={() => setPick("instant")} selected={pick === "instant"}>
          <div className="flex-1">
            <p className="text-sm font-semibold">Instant booking</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Guests can book straight away. Recommended.
            </p>
          </div>
          {pick === "instant" && <Check className="h-4 w-4 text-primary" />}
        </Card>
        <Card onClick={() => setPick("request")} selected={pick === "request"}>
          <div className="flex-1">
            <p className="text-sm font-semibold">Request to book</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Review and approve every booking before confirming.
            </p>
          </div>
          {pick === "request" && <Check className="h-4 w-4 text-primary" />}
        </Card>
      </div>
      <StickyFooter
        onBack={back}
        busy={busy}
        onContinue={async () => {
          setBusy(true);
          try {
            await save({ data: { default_booking_model: (pick as any) ?? "instant" } });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

// ---------- Step 11: Payments ----------
function Step11Payments({
  profile,
  next,
  back,
  refresh,
  hideAtProperty,
}: StepProps & { hideAtProperty?: boolean }) {
  const save = useServerFn(saveSetupPayments);
  const [payAtProp, setPayAtProp] = useState<boolean>(profile?.pay_at_property_enabled ?? false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <StepTitle
        title="Payments"
        sub="Travidz handles guest payments and pays you out via Stripe. You can also let guests pay at the property."
      />
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <p className="text-sm font-semibold">Online via Travidz</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Always on. Travidz facilitates secure card payments and pays the host minus our
          commission.
        </p>
      </div>
      {!hideAtProperty && <div className="mt-3">
        <label className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <input
            type="checkbox"
            checked={payAtProp}
            onChange={(e) => setPayAtProp(e.target.checked)}
            className="mt-1 h-4 w-4 accent-primary"
          />
          <div>
            <p className="text-sm font-semibold">Allow pay-at-property bookings</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Guests can reserve without paying online. You collect payment on arrival.
            </p>
          </div>
        </label>
      </div>}

      <div className="mt-4">
        <PayoutMethodCard />
      </div>

      <StickyFooter
        onBack={back}
        busy={busy}
        onContinue={async () => {
          setBusy(true);
          try {
            await save({ data: { pay_at_property_enabled: hideAtProperty ? false : payAtProp } });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

// ---------- Step 12: First unit ----------
function Step12FirstUnit({ profile, firstDeal, next, back, refresh }: StepProps) {
  const ensure = useServerFn(ensureFirstDeal);
  const mark = useServerFn(markSetupStepComplete);
  const [creating, setCreating] = useState(false);
  const [dealId, setDealId] = useState<string | null>(firstDeal?.id ?? null);
  const [busy, setBusy] = useState(false);

  const kind = profile?.setup_property_kind;
  const isHotel = kind === "hotel";

  useEffect(() => {
    if (dealId) return;
    setCreating(true);
    ensure()
      .then((r) => {
        setDealId(r.id);
        refresh();
      })
      .catch((e) => toast.error(e?.message ?? "Could not create draft listing"))
      .finally(() => setCreating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <StepTitle
        title={isHotel ? "Set up your first room type" : "Set up your first unit"}
        sub={
          isHotel
            ? "Add at least one room type with beds, occupancy and pricing. You can add more rooms later."
            : "Add the basics for your first listing. You can duplicate this later for more units."
        }
      />
      {creating && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {dealId && !isHotel && (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="mb-2 inline-flex items-center gap-2 font-semibold">
            <Bed className="h-4 w-4 text-primary" /> Quick layout
          </p>
          <p className="text-xs text-muted-foreground">
            We've created a draft listing using your address and host name. You can refine all the
            details (beds, bathrooms, amenities, description) from your dashboard after this setup.
          </p>
          <Link
            to="/business/deals/$id/edit"
            params={{ id: dealId }}
            target="_blank"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            Edit full details <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}
      {dealId && isHotel && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <RoomsAndRatesEditor dealId={dealId} category={firstDeal?.category} />
        </div>
      )}
      <StickyFooter
        onBack={back}
        busy={busy}
        disabled={!dealId}
        onContinue={async () => {
          setBusy(true);
          try {
            await mark({ data: { step: 12 } });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

// ---------- Step 13: Photos ----------
function Step13Photos({ profile, next, back, refresh }: StepProps) {
  const mark = useServerFn(markSetupStepComplete);
  const [busy, setBusy] = useState(false);
  const isActivity = profile?.setup_property_kind === "alternative";
  return (
    <>
      <StepTitle
        title="What does your place look like?"
        sub="Upload at least 5 photos. The more you upload, the more likely you are to get bookings."
      />
      <BusinessPhotosEditor businessId={profile.id} kind={isActivity ? "activity" : "stay"} />
      <StickyFooter
        onBack={back}
        busy={busy}
        onContinue={async () => {
          setBusy(true);
          try {
            await mark({ data: { step: 13 } });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

// ---------- Step 14: Pricing & policies ----------
const CANCEL_POLICIES = [
  { v: "travidz_standard", label: "Travidz standard" },
  { v: "free_cancel_until_start", label: "Free cancellation until check-in" },
  { v: "custom_24h", label: "Free cancellation until 24h before" },
  { v: "custom_7d", label: "Free cancellation until 7 days before" },
  { v: "non_refundable", label: "Non-refundable" },
];
function Step14Pricing({ profile, firstDeal, next, back, refresh }: StepProps) {
  const save = useServerFn(saveSetupPricing);
  const [priceMajor, setPriceMajor] = useState<string>(
    firstDeal?.price_cents ? (firstDeal.price_cents / 100).toFixed(2) : ""
  );
  const [currency, setCurrency] = useState<string>(firstDeal?.currency ?? "GBP");
  const [policy, setPolicy] = useState<string>(
    firstDeal?.cancellation_policy_code ?? "travidz_standard"
  );
  const [longStays, setLongStays] = useState<boolean>(profile?.long_stays_enabled ?? true);
  const [busy, setBusy] = useState(false);
  const priceNum = Number(priceMajor);
  const valid = firstDeal?.id && priceNum > 0 && currency.length === 3;

  return (
    <>
      <StepTitle
        title="Pricing & policies"
        sub="Set the base price guests will see. You can fine-tune seasonal pricing later."
      />
      <div className="space-y-3">
        <Field label="Price per night">
          <div className="flex gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            >
              {["GBP", "EUR", "USD"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceMajor}
              onChange={(e) => setPriceMajor(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="120.00"
            />
          </div>
        </Field>
        <Field label="Cancellation policy">
          <div className="space-y-2">
            {CANCEL_POLICIES.map((p) => (
              <Card key={p.v} onClick={() => setPolicy(p.v)} selected={policy === p.v}>
                <div className="flex-1 text-sm">{p.label}</div>
                {policy === p.v && <Check className="h-4 w-4 text-primary" />}
              </Card>
            ))}
          </div>
        </Field>
        <label className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <input
            type="checkbox"
            checked={longStays}
            onChange={(e) => setLongStays(e.target.checked)}
            className="mt-1 h-4 w-4 accent-primary"
          />
          <div>
            <p className="text-sm font-semibold">Accept stays of 30+ nights</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Long stays can boost occupancy in the off-season.
            </p>
          </div>
        </label>
      </div>
      <StickyFooter
        onBack={back}
        busy={busy}
        disabled={!valid}
        onContinue={async () => {
          if (!valid) return;
          setBusy(true);
          try {
            await save({
              data: {
                dealId: firstDeal!.id,
                price_cents: Math.round(priceNum * 100),
                currency,
                cancellation_policy_code: policy as any,
                long_stays_enabled: longStays,
              },
            });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

// ---------- Step 15: Legal entity ----------
function Step15LegalEntity({ profile, next, back, refresh }: StepProps) {
  const save = useServerFn(saveSetupLegalEntity);
  const [pick, setPick] = useState<string | null>(profile?.legal_entity_type ?? null);
  const [name, setName] = useState(profile?.legal_entity_name ?? "");
  const [email, setEmail] = useState(profile?.legal_contact_email ?? "");
  const [phone, setPhone] = useState(profile?.legal_contact_phone ?? "");
  const [busy, setBusy] = useState(false);
  const valid = pick === "individual" || (pick === "business" && name && email);
  return (
    <>
      <StepTitle
        title="Are you listing as an individual or a business?"
        sub="This determines how we structure your contract and tax details."
      />
      <div className="space-y-3">
        <Card onClick={() => setPick("individual")} selected={pick === "individual"}>
          <div className="flex-1">
            <p className="text-sm font-semibold">Individual</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              You manage your listing personally.
            </p>
          </div>
          {pick === "individual" && <Check className="h-4 w-4 text-primary" />}
        </Card>
        <Card onClick={() => setPick("business")} selected={pick === "business"}>
          <div className="flex-1">
            <p className="text-sm font-semibold">Business</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Company, partnership, non-profit, etc.
            </p>
          </div>
          {pick === "business" && <Check className="h-4 w-4 text-primary" />}
        </Card>
      </div>

      {pick === "business" && (
        <div className="mt-3 space-y-3">
          <Field label="Registered name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Contact email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Contact phone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>
        </div>
      )}

      <StickyFooter
        onBack={back}
        busy={busy}
        disabled={!valid}
        onContinue={async () => {
          if (!pick) return;
          setBusy(true);
          try {
            await save({
              data: {
                legal_entity_type: pick as any,
                legal_entity_name: pick === "business" ? name : null,
                legal_contact_email: pick === "business" ? email : null,
                legal_contact_phone: pick === "business" ? phone : null,
              },
            });
            refresh();
            next();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

// ---------- Step 16: Go live ----------
function Step16GoLive({ profile, firstDeal, back, refresh }: StepProps) {
  const complete = useServerFn(completeSetup);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const summary = useMemo(
    () => [
      { label: "Property type", value: profile?.setup_property_kind ?? "—" },
      { label: "Units", value: profile?.setup_unit_count ?? "—" },
      { label: "Address", value: profile?.place_name ?? profile?.address ?? "—" },
      {
        label: "Booking model",
        value: profile?.default_booking_model === "request" ? "Request to book" : "Instant",
      },
      {
        label: "Pay at property",
        value: profile?.pay_at_property_enabled ? "Yes" : "No",
      },
      {
        label: "Cancellation policy",
        value: (firstDeal?.cancellation_policy_code ?? "—").toString().replaceAll("_", " "),
      },
    ],
    [profile, firstDeal]
  );

  async function finish(activate: boolean) {
    setBusy(true);
    try {
      await complete({ data: { activateFirstDeal: activate, dealId: firstDeal?.id } });
      refresh();
      toast.success(activate ? "You're live!" : "Draft saved");
      navigate({ to: "/business" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StepTitle
        kicker="Almost there"
        title="Review and go live"
        sub="Double-check your details. You can always edit anything later from your dashboard."
      />
      <ul className="space-y-2 rounded-2xl border border-border bg-card p-2">
        {summary.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-between rounded-xl px-3 py-2 text-sm"
          >
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-medium capitalize">{String(s.value)}</span>
          </li>
        ))}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-lg space-y-2">
          <button
            onClick={() => finish(true)}
            disabled={busy || !firstDeal?.id}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Open for bookings
          </button>
          <div className="flex gap-2">
            <button
              onClick={back}
              className="rounded-full border border-border bg-card px-4 py-3 text-sm font-medium"
            >
              Back
            </button>
            <button
              onClick={() => finish(false)}
              disabled={busy}
              className="flex-1 rounded-full border border-border bg-card px-4 py-3 text-sm font-medium"
            >
              I'm not ready yet
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
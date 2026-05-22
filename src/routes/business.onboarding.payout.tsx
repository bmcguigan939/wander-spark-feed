import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Banknote, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth";
import {
  getMyPayoutMethod,
  saveBankPayoutMethod,
} from "@/lib/payout.functions";
import { PayoutMethodCard } from "@/components/business/PayoutMethodCard";

export const Route = createFileRoute("/business/onboarding/payout")({
  head: () => ({ meta: [{ title: "Payout setup — Travidz" }] }),
  component: PayoutSetupPage,
});

type Region = "GB" | "SEPA" | "OTHER";

const SEPA_COUNTRIES = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO","CH",
];

function PayoutSetupPage() {
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getMyPayoutMethod);
  const saveFn = useServerFn(saveBankPayoutMethod);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  const { data: existing } = useQuery({
    queryKey: ["payout-method"],
    queryFn: () => getFn(),
    enabled: !!user && isBusiness,
  });

  const [region, setRegion] = useState<Region>("GB");
  const [country, setCountry] = useState("GB");
  const [holder, setHolder] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const countryOptions = useMemo(() => {
    if (region === "GB") return ["GB"];
    if (region === "SEPA") return SEPA_COUNTRIES;
    return ["US","CA","AU","NZ","AE","SG","HK","JP","ZA","IN","BR","MX"];
  }, [region]);

  useEffect(() => {
    if (!countryOptions.includes(country)) setCountry(countryOptions[0]);
  }, [region, countryOptions, country]);

  const saveMut = useMutation({
    mutationFn: (payload: any) => saveFn({ data: payload }),
    onSuccess: () => {
      toast.success("Payout method saved");
      qc.invalidateQueries({ queryKey: ["payout-method"] });
      setHolder("");
      setSortCode("");
      setAccountNumber("");
      setIban("");
      setSwift("");
      setErrors({});
    },
    onError: (e: any) => {
      const msg = e?.message ?? "Failed to save";
      // Try to surface field-specific zod errors when present.
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed)) {
          const next: Record<string, string> = {};
          for (const issue of parsed) {
            const path = (issue?.path ?? []).join(".") || "_";
            next[path] = issue?.message ?? "Invalid";
          }
          setErrors(next);
          toast.error("Please fix the highlighted fields");
          return;
        }
      } catch {
        // not a zod payload
      }
      toast.error(msg);
    },
  });

  if (!user || !isBusiness) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const payload: any = {
      account_holder: holder.trim(),
      country,
    };
    if (region === "GB") {
      payload.sort_code = sortCode.replace(/\D/g, "");
      payload.account_number = accountNumber.replace(/\D/g, "");
    } else {
      payload.iban = iban.replace(/\s+/g, "").toUpperCase();
      if (swift.trim()) payload.swift_bic = swift.trim().toUpperCase();
    }
    saveMut.mutate(payload);
  };

  const fieldErr = (k: string) => errors[k] && (
    <p className="mt-1 text-xs text-destructive">{errors[k]}</p>
  );

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-24">
        <Link to="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Payouts</h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Travidz collects payment from customers and pays you weekly, minus an
          11% platform commission. Add the bank account where you'd like to
          receive your earnings.
        </p>

        <div className="mt-4">
          <PayoutMethodCard compact />
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Region</label>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {(["GB","SEPA","OTHER"] as Region[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                    region === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60"
                  }`}
                >
                  {r === "GB" ? "UK" : r === "SEPA" ? "EU (SEPA)" : "Other"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm"
            >
              {countryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Account holder name</label>
            <input
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="As shown on the bank account"
              className="mt-1 w-full rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm"
              maxLength={80}
              required
            />
            {fieldErr("account_holder")}
          </div>

          {region === "GB" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Sort code</label>
                <input
                  value={sortCode}
                  onChange={(e) => setSortCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm"
                  required
                />
                {fieldErr("sort_code")}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Account number</label>
                <input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="12345678"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm"
                  required
                />
                {fieldErr("account_number")}
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">IBAN</label>
                <input
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase())}
                  placeholder="e.g. GB29 NWBK 6016 1331 9268 19"
                  className="mt-1 w-full rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm font-mono"
                  required
                />
                {fieldErr("iban")}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  SWIFT / BIC {region === "OTHER" ? "" : "(optional)"}
                </label>
                <input
                  value={swift}
                  onChange={(e) => setSwift(e.target.value.toUpperCase())}
                  placeholder="e.g. NWBKGB2L"
                  className="mt-1 w-full rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm font-mono"
                  required={region === "OTHER"}
                />
                {fieldErr("swift_bic")}
              </div>
            </>
          )}

          {errors._ && (
            <p className="text-xs text-destructive">{errors._}</p>
          )}

          <button
            type="submit"
            disabled={saveMut.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saveMut.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <>Save payout method</>
            )}
          </button>

          <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/30 p-3 text-[11px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <p>
              Your details are encrypted at rest. Only Travidz support and
              payouts staff can decrypt them — your browser only ever sees the
              last 4 digits.
            </p>
          </div>
        </form>

        {existing?.payout_method === "manual_bank" && (
          <div className="mt-6 rounded-xl border border-border/60 bg-card/30 p-3 text-xs text-muted-foreground">
            Saving new details will replace the existing payout account.
          </div>
        )}
      </div>
    </MobileShell>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, ExternalLink, Hash, AtSign, Sparkles } from "lucide-react";
import { MobileShell } from "@/components/layout/BottomNav";
import { getCollabByCode } from "@/lib/collabs.functions";

export const Route = createFileRoute("/collab/$code")({
  head: ({ params }) => ({
    meta: [{ title: `Collab ${params.code} — Travidz` }],
  }),
  component: CollabBrief,
});

function CollabBrief() {
  const { code } = Route.useParams();
  const fetchFn = useServerFn(getCollabByCode);
  const { data, isLoading } = useQuery({
    queryKey: ["collab", code],
    queryFn: () => fetchFn({ data: { code } }),
  });
  const c = data?.collab as any;

  return (
    <MobileShell>
      <div className="px-4 pt-6 pb-24">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {isLoading && <div className="mt-6 h-40 animate-pulse rounded-xl bg-muted/40" />}

        {!isLoading && !c && (
          <div className="mt-10 rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No active collab found for code <span className="font-mono">{code}</span>.</p>
          </div>
        )}

        {c && (
          <>
            <div className="mt-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h1 className="text-xl font-semibold">Your collab brief</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Code <span className="font-mono text-foreground">{c.application.approved_code}</span> ·{" "}
              {c.application.commission_pct ?? "—"}% commission
            </p>

            <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card/40">
              {c.deal?.image_url && (
                <img src={c.deal.image_url} alt="" className="h-40 w-full object-cover" />
              )}
              <div className="p-3">
                <p className="text-[11px] text-muted-foreground">
                  {c.business?.business_name || c.business?.display_name || `@${c.business?.username}`}
                </p>
                <h2 className="text-sm font-semibold">{c.deal?.title}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[c.deal?.city, c.deal?.country].filter(Boolean).join(", ") || c.deal?.destination}
                </p>
                {c.deal?.url && (
                  <a
                    href={c.deal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary"
                  >
                    Visit business page <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </section>

            <Section title="Deliverables">
              {(c.defaults?.default_deliverables ?? []).length === 0 ? (
                <Empty text="Business hasn't set deliverables — message them in your thread." />
              ) : (
                <ul className="space-y-1.5">
                  {(c.defaults.default_deliverables as string[]).map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {(c.defaults?.default_nights || c.defaults?.default_usage_rights_days) && (
              <Section title="Terms">
                <ul className="space-y-1 text-sm">
                  {c.defaults?.default_nights != null && (
                    <li>· {c.defaults.default_nights} comp night{c.defaults.default_nights === 1 ? "" : "s"}</li>
                  )}
                  {c.defaults?.default_usage_rights_days != null && (
                    <li>· Usage rights: {c.defaults.default_usage_rights_days} days</li>
                  )}
                </ul>
              </Section>
            )}

            {(c.defaults?.brand_dos || c.defaults?.brand_donts) && (
              <Section title="Brand do's & don'ts">
                {c.defaults?.brand_dos && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-emerald-500">Do</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{c.defaults.brand_dos}</p>
                  </div>
                )}
                {c.defaults?.brand_donts && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase text-destructive">Don't</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{c.defaults.brand_donts}</p>
                  </div>
                )}
              </Section>
            )}

            {((c.defaults?.required_hashtags ?? []).length > 0 ||
              (c.defaults?.required_mentions ?? []).length > 0) && (
              <Section title="Required tags">
                <div className="flex flex-wrap gap-1.5">
                  {(c.defaults?.required_hashtags ?? []).map((h: string) => (
                    <span key={h} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      <Hash className="h-3 w-3" />{h.replace(/^#/, "")}
                    </span>
                  ))}
                  {(c.defaults?.required_mentions ?? []).map((m: string) => (
                    <span key={m} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      <AtSign className="h-3 w-3" />{m.replace(/^@/, "")}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Submit proof">
              <p className="text-sm text-muted-foreground">
                Once your content is live, share the links in your business thread so they can confirm and your commissions start tracking.
              </p>
              <Link
                to="/studio/threads"
                className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Open thread
              </Link>
            </Section>
          </>
        )}
      </div>
    </MobileShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card/40 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground">{text}</p>;
}
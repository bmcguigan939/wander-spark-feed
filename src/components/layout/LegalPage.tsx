import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

const LINKS = [
  { to: "/legal/terms", label: "Terms" },
  { to: "/legal/privacy", label: "Privacy" },
  { to: "/legal/cookies", label: "Cookies" },
  { to: "/legal/creator-agreement", label: "Creator agreement" },
  { to: "/legal/business-agreement", label: "Business agreement" },
  { to: "/legal/dmca", label: "DMCA" },
] as const;

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="ml-auto font-display text-lg font-semibold">Travidz</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Last updated · {updated}</p>
        <div className="prose prose-invert mt-8 max-w-none text-sm leading-relaxed text-foreground/90 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1 [&_a]:text-primary [&_a]:underline">
          {children}
        </div>
        <nav className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/40 pt-6 text-xs text-muted-foreground">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-foreground">{l.label}</Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
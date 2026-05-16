import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function CinematicHeader({
  title,
  eyebrow,
  subtitle,
  image,
  trailing,
  height = "h-64",
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  image?: string | null;
  trailing?: ReactNode;
  height?: string;
}) {
  return (
    <header className={`relative ${height} w-full overflow-hidden`}>
      {image ? (
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="eager" />
      ) : (
        <div className="absolute inset-0 bg-aurora opacity-90" />
      )}
      <div className="absolute inset-0 overlay-bottom" />
      <div className="absolute inset-0 overlay-top opacity-60" />
      <div className="relative flex h-full flex-col justify-end px-5 pb-5 pt-12">
        {eyebrow && <span className="eyebrow mb-2 text-white/80">{eyebrow}</span>}
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold leading-[1.05] text-white drop-shadow-sm sm:text-4xl">
            {title}
          </h1>
          {trailing}
        </div>
        {subtitle && <p className="mt-2 max-w-md text-sm text-white/75">{subtitle}</p>}
      </div>
    </header>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="surface-1 relative overflow-hidden rounded-[1.25rem] border border-border/70 p-4 shadow-soft">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="eyebrow">{label}</span>
        {Icon && <Icon className="h-3.5 w-3.5 opacity-70" />}
      </div>
      <div data-stat className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  trailing,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div>
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {trailing}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  as,
  to,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  as?: "button" | "link";
  to?: string;
}) {
  const cls = `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
    active
      ? "border-primary bg-primary text-primary-foreground shadow-soft"
      : "border-border bg-card text-foreground/85 hover:border-foreground/30 hover:text-foreground"
  }`;
  if (as === "link" && to) {
    return <Link to={to} className={cls}>{children}</Link>;
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xs px-6 py-16 text-center">
      {Icon && (
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-soft">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
      {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Sparkline({ data, color = "currentColor" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const w = 240, h = 56, pad = 4;
  const max = Math.max(1, ...data);
  const stepX = (w - pad * 2) / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M${pts.join(" L")}`;
  const area = `M${pad},${h - pad} L${pts.join(" L")} L${(w - pad).toFixed(1)},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" preserveAspectRatio="none">
      <path d={area} fill={color} opacity="0.12" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
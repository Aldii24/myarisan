import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60";

export const buttonStyles = {
  danger: `${buttonBase} border border-danger-border bg-danger-surface text-danger-foreground hover:bg-danger-border/40`,
  ghost: `${buttonBase} text-muted-foreground hover:bg-accent hover:text-foreground`,
  primary: `${buttonBase} bg-primary text-primary-foreground shadow-sm hover:bg-primary/90`,
  secondary: `${buttonBase} border border-border bg-card text-foreground hover:bg-accent`,
};

export function BrandLogo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        aria-hidden="true"
        className="h-11 w-11 shrink-0 drop-shadow-sm"
        fill="none"
        viewBox="0 0 48 48"
      >
        <rect fill="url(#logoBg)" height="48" rx="16" width="48" />
        <path
          d="M15.5 24a8.5 8.5 0 0 1 14.7-5.8"
          stroke="#F7D4B4"
          strokeLinecap="round"
          strokeWidth="3.4"
        />
        <path
          d="M32.5 24a8.5 8.5 0 0 1-14.7 5.8"
          stroke="#BFDCCF"
          strokeLinecap="round"
          strokeWidth="3.4"
        />
        <circle cx="24" cy="24" fill="#FFF8EF" r="5.8" />
        <circle cx="24" cy="24" fill="#166C54" r="2.4" />
        <path
          d="M31.2 16.7h5.1v5.1"
          stroke="#C8B6FF"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
        <path
          d="M16.8 31.3h-5.1v-5.1"
          stroke="#F0A88B"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
        <defs>
          <linearGradient id="logoBg" x1="5" x2="44" y1="4" y2="44">
            <stop stopColor="#0F5F4A" />
            <stop offset="1" stopColor="#19856A" />
          </linearGradient>
        </defs>
      </svg>
      {!compact ? (
        <div>
          <p className="text-lg font-semibold tracking-tight text-foreground">MyArisan</p>
          <p className="text-xs font-medium text-muted-foreground">
            Rekap arisan lebih tenang
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function AppBackground({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <ThemeToggle className="fixed right-4 top-4 z-50 shadow-sm" />
      {children}
    </main>
  );
}

export function GlassPanel({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "subtle";
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm",
        variant === "elevated" && "shadow-md",
        variant === "subtle" && "bg-muted/40 shadow-none",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AppBackground>
      <div className={cn("mx-auto w-full max-w-7xl pb-8", className)}>{children}</div>
    </AppBackground>
  );
}

const metricAccent = {
  amber: "bg-warning-foreground",
  emerald: "bg-success-foreground",
  neutral: "bg-muted-foreground",
  red: "bg-danger-foreground",
};

export function MetricCard({
  accent = "emerald",
  label,
  value,
}: {
  accent?: "amber" | "emerald" | "neutral" | "red";
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={cn("size-1.5 rounded-full", metricAccent[accent])} />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

export function ButtonLink({
  children,
  className,
  href,
  variant = "secondary",
}: {
  children: React.ReactNode;
  className?: string;
  href: string;
  variant?: keyof typeof buttonStyles;
}) {
  return (
    <Link className={cn(buttonStyles[variant], className)} href={href}>
      {children}
    </Link>
  );
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const normalized = (status ?? "").toLocaleLowerCase("id-ID");
  const isPaid =
    normalized.includes("sudah") ||
    normalized.includes("confirmed") ||
    normalized.includes("aktif");
  const isPending = normalized.includes("menunggu") || normalized.includes("pending");
  const isRejected =
    normalized.includes("ditolak") ||
    normalized.includes("rejected") ||
    normalized.includes("expired");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        isPaid && "border-success-border bg-success-surface text-success-foreground",
        isPending && "border-warning-border bg-warning-surface text-warning-foreground",
        isRejected && "border-danger-border bg-danger-surface text-danger-foreground",
        !isPaid &&
          !isPending &&
          !isRejected &&
          "border-border bg-muted text-muted-foreground",
      )}
    >
      {status ?? "Belum Bayar"}
    </span>
  );
}

export function EmptyState({
  action,
  children,
  title = "Belum ada data",
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
      <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <span className="text-lg font-semibold">–</span>
      </div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {children}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function FormFieldHint({ children }: { children: React.ReactNode }) {
  return <p className="ui-help">{children}</p>;
}

export function CopyTextCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <GlassPanel className="p-5" variant="subtle">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </GlassPanel>
  );
}

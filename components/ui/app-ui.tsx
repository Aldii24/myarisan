import Link from "next/link";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const buttonStyles = {
  danger:
    "inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-200/80 bg-red-50/80 px-4 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70",
  ghost:
    "inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-zinc-700 transition hover:bg-white/45 disabled:cursor-not-allowed disabled:opacity-70",
  primary:
    "inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(22,108,84,0.25)] transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70",
  secondary:
    "inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/55 bg-white/45 px-4 text-sm font-semibold text-zinc-800 shadow-sm backdrop-blur transition hover:border-emerald-200 hover:bg-emerald-50/80 disabled:cursor-not-allowed disabled:opacity-70",
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
          <p className="text-lg font-semibold tracking-tight text-zinc-950">MyArisan</p>
          <p className="text-xs font-medium text-zinc-500">Rekap arisan lebih tenang</p>
        </div>
      ) : null}
    </div>
  );
}

export function AppBackground({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-50 px-4 py-5 text-zinc-950 sm:px-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-[-8rem] h-72 w-72 rounded-full bg-[#f4b08f]/35 blur-3xl" />
        <div className="absolute right-[-7rem] top-12 h-80 w-80 rounded-full bg-[#bfe5d5]/55 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-96 w-96 rounded-full bg-[#c8b6ff]/30 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.36)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.28)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />
      </div>
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
        "glass-panel relative overflow-hidden rounded-[1.5rem] border border-white/55 bg-white/58 p-5 shadow-[0_24px_80px_rgba(67,48,35,0.13)] backdrop-blur-2xl",
        variant === "elevated" && "bg-white/68 shadow-[0_30px_110px_rgba(67,48,35,0.18)]",
        variant === "subtle" && "bg-white/38 shadow-[0_14px_48px_rgba(67,48,35,0.09)]",
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

export function MetricCard({
  accent = "emerald",
  label,
  value,
}: {
  accent?: "amber" | "emerald" | "neutral" | "red";
  label: string;
  value: React.ReactNode;
}) {
  const accentClasses = {
    amber: "from-amber-400/24 to-orange-200/18 text-amber-900",
    emerald: "from-emerald-400/24 to-teal-100/20 text-emerald-950",
    neutral: "from-slate-300/22 to-white/10 text-zinc-800",
    red: "from-red-300/22 to-rose-100/12 text-red-700",
  };

  return (
    <div
      className={cn(
        "rounded-3xl border border-white/55 bg-gradient-to-br p-4 shadow-sm backdrop-blur",
        accentClasses[accent],
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
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
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur",
        isPaid && "border-emerald-200/80 bg-emerald-50/90 text-emerald-900",
        isPending && "border-amber-200/80 bg-amber-50/95 text-amber-900",
        isRejected && "border-red-200/80 bg-red-50/95 text-red-700",
        !isPaid && !isPending && !isRejected && "border-zinc-200/80 bg-zinc-100/85 text-zinc-700",
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
    <GlassPanel className="p-5 text-center" variant="subtle">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-900">
        <span className="text-lg font-semibold">-</span>
      </div>
      <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">{children}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </GlassPanel>
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
      <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </GlassPanel>
  );
}

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Small, shared presentational building blocks for the landing page so every
// section uses the same eyebrow / heading / pill / gradient language. Pure
// server components (no hooks) — safe to render anywhere.

export function Eyebrow({
  children,
  className,
  inverse = false,
}: {
  children: ReactNode;
  className?: string;
  inverse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-[0.14em] uppercase",
        inverse
          ? "border-white/15 bg-white/10 text-[#9fe2c4]"
          : "border-[#cfe3da] bg-white/70 text-[#13795b] shadow-sm backdrop-blur",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function GradientText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-gradient-to-r from-[#13795b] via-[#1f9170] to-[#2fae84] bg-clip-text text-transparent",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  centered = false,
  className,
  description,
  eyebrow,
  inverse = false,
  title,
}: {
  centered?: boolean;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  inverse?: boolean;
  title: ReactNode;
}) {
  return (
    <div className={cn("max-w-2xl", centered && "mx-auto text-center", className)}>
      {eyebrow ? (
        <div className={cn("mb-5", centered && "flex justify-center")}>
          <Eyebrow inverse={inverse}>{eyebrow}</Eyebrow>
        </div>
      ) : null}
      <h2
        className={cn(
          "text-3xl font-extrabold tracking-[-0.04em] text-balance sm:text-4xl lg:text-[2.9rem] lg:leading-[1.08]",
          inverse ? "text-white" : "text-[#16332b]",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-5 text-base leading-7 text-pretty sm:text-lg",
            inverse ? "text-white/70" : "text-[#5c6b66]",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  inverse = false,
}: {
  inverse?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p
        className={cn(
          "text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl",
          inverse ? "text-white" : "text-[#16332b]",
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "mt-1 text-xs font-semibold",
          inverse ? "text-white/55" : "text-[#6c7b76]",
        )}
      >
        {label}
      </p>
    </div>
  );
}

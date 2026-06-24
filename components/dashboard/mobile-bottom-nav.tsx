import {
  CalendarClock,
  LayoutDashboard,
  Package as PackageIcon,
  Upload,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  id: string;
  label: string;
};

function getItems(arisanId: string, role: "admin" | "member"): NavItem[] {
  if (role === "member") {
    return [
      {
        href: `/app/arisan/${arisanId}`,
        icon: LayoutDashboard,
        id: "ringkasan",
        label: "Ringkasan",
      },
      {
        href: `/app/arisan/${arisanId}/bayar`,
        icon: Upload,
        id: "bayar",
        label: "Bayar",
      },
      {
        href: `/app/arisan/${arisanId}/giliran`,
        icon: CalendarClock,
        id: "giliran",
        label: "Giliran",
      },
    ];
  }

  return [
    {
      href: `/app/arisan/${arisanId}`,
      icon: LayoutDashboard,
      id: "ringkasan",
      label: "Ringkasan",
    },
    {
      href: `/app/arisan/${arisanId}/payments`,
      icon: WalletCards,
      id: "bukti",
      label: "Bukti",
    },
    {
      href: `/app/arisan/${arisanId}/members`,
      icon: Users,
      id: "anggota",
      label: "Anggota",
    },
    {
      href: `/app/arisan/${arisanId}/giliran`,
      icon: CalendarClock,
      id: "giliran",
      label: "Giliran",
    },
    {
      href: `/app/arisan/${arisanId}/paket`,
      icon: PackageIcon,
      id: "paket",
      label: "Paket",
    },
  ];
}

const gridColsByCount: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

export function MobileBottomNav({
  activeItem,
  arisanId,
  role,
}: {
  activeItem: string;
  arisanId: string;
  role: "admin" | "member";
}) {
  const items = getItems(arisanId, role);

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn(
        "fixed inset-x-3 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 grid gap-0 rounded-2xl border border-border bg-card/90 p-1 shadow-lg shadow-foreground/10 backdrop-blur-xl lg:hidden",
        gridColsByCount[items.length] ?? "grid-cols-4",
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeItem;

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[0.68rem] font-medium transition-[transform,color] duration-150 active:scale-95 motion-reduce:active:scale-100",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
            href={item.href}
            key={item.id}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg transition-colors",
                active ? "bg-primary/10" : "bg-transparent",
              )}
            >
              <Icon className="size-[1.15rem]" />
            </span>
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

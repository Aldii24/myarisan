import {
  LayoutDashboard,
  Package as PackageIcon,
  Upload,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
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
      href: `/app/arisan/${arisanId}/paket`,
      icon: PackageIcon,
      id: "paket",
      label: "Paket",
    },
  ];
}

export function MobileBottomNav({
  activeItem,
  arisanId,
  role,
}: {
  activeItem: string;
  arisanId: string;
  role: "admin" | "member";
}) {
  return (
    <Card
      className={cn(
        "fixed inset-x-3 bottom-3 z-50 grid gap-0 border-white/90 bg-white/92 px-1 py-1 shadow-2xl shadow-zinc-900/15 backdrop-blur-xl lg:hidden",
        role === "admin" ? "grid-cols-4" : "grid-cols-2",
      )}
    >
      {getItems(arisanId, role).map((item) => {
        const Icon = item.icon;
        const active = item.id === activeItem;

        return (
          <Link
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[0.68rem] font-medium transition-colors",
              active
                ? "bg-emerald-50 text-emerald-800"
                : "text-zinc-500 hover:text-zinc-900",
            )}
            href={item.href}
            key={item.id}
          >
            <Icon className="size-4" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </Card>
  );
}

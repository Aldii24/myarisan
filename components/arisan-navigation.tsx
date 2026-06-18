import {
  LayoutDashboard,
  Package as PackageIcon,
  ReceiptText,
  Users,
} from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    adminOnly: false,
    icon: LayoutDashboard,
    label: "Ringkasan",
    path: "",
  },
  {
    adminOnly: false,
    icon: ReceiptText,
    label: "Bukti",
    path: "payments",
  },
  {
    adminOnly: true,
    icon: Users,
    label: "Anggota",
    path: "members",
  },
  {
    adminOnly: true,
    icon: PackageIcon,
    label: "Paket",
    path: "paket",
  },
] as const;

function itemHref(arisanId: string, path: string, role: "admin" | "member") {
  if (path === "payments" && role === "member") {
    return `/app/arisan/${arisanId}/bayar`;
  }

  return path
    ? `/app/arisan/${arisanId}/${path}`
    : `/app/arisan/${arisanId}`;
}

export function ArisanNavigation({
  activeItem,
  arisanId,
  role,
}: {
  activeItem: string;
  arisanId: string;
  role: "admin" | "member";
}) {
  return (
    <>
      <aside className="hidden lg:block">
        <Card className="sticky top-6 gap-0 border-white/80 bg-white/85 py-0 shadow-sm">
          <div className="flex items-center gap-3 p-5">
            <BrandMark className="size-10" />
            <div>
              <p className="font-semibold text-foreground">MyArisan</p>
              <p className="text-xs text-muted-foreground">Halaman Arisan</p>
            </div>
          </div>
          <Separator />
          <nav className="space-y-1 p-3">
            {navigationItems.map((item) => {
              const disabled = Boolean(item.adminOnly && role !== "admin");
              const Icon = item.icon;
              const classes = cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                activeItem === item.label
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                disabled && "pointer-events-none opacity-35",
              );

              return disabled ? (
                <span aria-disabled="true" className={classes} key={item.label}>
                  <Icon className="size-4" />
                  {item.label}
                </span>
              ) : (
                <Link
                  className={classes}
                  href={itemHref(arisanId, item.path, role)}
                  key={item.label}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Separator />
          <Link
            className="m-3 flex h-10 items-center justify-center rounded-lg border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            href="/app/select-arisan"
          >
            Ganti Arisan
          </Link>
        </Card>
      </aside>

      <Card className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 gap-0 border-white/80 bg-white/90 px-1 py-1 shadow-2xl shadow-zinc-900/15 backdrop-blur-xl lg:hidden">
        {navigationItems.map((item) => {
          const disabled = Boolean(item.adminOnly && role !== "admin");
          const Icon = item.icon;
          const classes = cn(
            "flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[0.68rem] font-medium",
            activeItem === item.label
              ? "bg-emerald-50 text-emerald-800"
              : "text-muted-foreground",
            disabled && "opacity-35",
          );

          return disabled ? (
            <span aria-disabled="true" className={classes} key={item.label}>
              <Icon className="size-4" />
              <span className="truncate">{item.label}</span>
            </span>
          ) : (
            <Link
              className={classes}
              href={itemHref(arisanId, item.path, role)}
              key={item.label}
            >
              <Icon className="size-4" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </Card>
    </>
  );
}

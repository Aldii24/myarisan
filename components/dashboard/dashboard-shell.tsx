"use client";

import {
  Bell,
  CalendarClock,
  LayoutDashboard,
  Package as PackageIcon,
  ReceiptText,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function desktopItems(arisanId: string, role: "admin" | "member") {
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
        label: "Kirim Bukti",
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
      icon: ReceiptText,
      id: "bukti",
      label: "Konfirmasi Bukti",
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

function NotificationBell({
  className,
  unreadCount = 0,
}: {
  className?: string;
  unreadCount?: number;
}) {
  return (
    <Link
      aria-label={
        unreadCount > 0
          ? `Notifikasi, ${unreadCount} belum dibaca`
          : "Notifikasi"
      }
      className={cn(
        "relative inline-flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className,
      )}
      href="/app/notifications"
    >
      <Bell className="size-4" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-semibold leading-4 text-primary-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

export function DashboardShell({
  arisanId,
  children,
  role,
  unreadCount = 0,
}: {
  arisanId: string;
  children: React.ReactNode;
  role: "admin" | "member";
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const activeItem = pathname.includes("/payments")
    ? "bukti"
    : pathname.includes("/members")
      ? "anggota"
      : pathname.includes("/paket")
        ? "paket"
        : pathname.includes("/giliran")
          ? "giliran"
          : pathname.includes("/bayar")
            ? "bayar"
            : "ringkasan";

  return (
    <main className="min-h-dvh overflow-x-hidden bg-background px-4 py-4 pb-24 sm:px-6 lg:px-8 lg:py-6 lg:pb-8">
      <div className="mx-auto grid w-full max-w-7xl gap-5 lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <Card className="sticky top-6 gap-0 py-0 shadow-sm">
            <div className="flex items-center gap-3 p-5">
              <BrandMark className="size-10" />
              <div>
                <p className="font-semibold text-foreground">MyArisan</p>
                <p className="text-xs text-muted-foreground">Halaman Arisan</p>
              </div>
            </div>
            <Separator />
            <nav className="space-y-1 p-3">
              {desktopItems(arisanId, role).map((item) => {
                const Icon = item.icon;
                const active = item.id === activeItem;

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                    href={item.href}
                    key={item.id}
                  >
                    {active ? (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                    ) : null}
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <Separator />
            <div className="m-3 flex items-center gap-2">
              <Link
                className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                href="/app/select-arisan"
              >
                Ganti Arisan
              </Link>
              <ThemeToggle className="size-10 shrink-0" />
              <NotificationBell className="size-10 shrink-0" unreadCount={unreadCount} />
            </div>
          </Card>
        </aside>

        <div className="min-w-0 space-y-4 md:space-y-5">
          <header className="flex h-10 items-center justify-between lg:hidden">
            <div className="flex items-center gap-3">
              <BrandMark className="size-9" />
              <div>
                <p className="text-sm font-semibold text-foreground">MyArisan</p>
                <p className="text-xs text-muted-foreground">
                  {role === "admin" ? "Admin Arisan" : "Anggota Arisan"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                className="flex h-9 items-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                href="/app/select-arisan"
              >
                Ganti Arisan
              </Link>
              <ThemeToggle className="size-9 shrink-0" />
              <NotificationBell className="size-9 shrink-0" unreadCount={unreadCount} />
            </div>
          </header>
          {children}
        </div>
      </div>

      <MobileBottomNav activeItem={activeItem} arisanId={arisanId} role={role} />
    </main>
  );
}


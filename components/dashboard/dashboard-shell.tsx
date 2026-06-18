"use client";

import {
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
      href: `/app/arisan/${arisanId}/paket`,
      icon: PackageIcon,
      id: "paket",
      label: "Paket",
    },
  ];
}

export function DashboardShell({
  arisanId,
  children,
  role,
}: {
  arisanId: string;
  children: React.ReactNode;
  role: "admin" | "member";
}) {
  const pathname = usePathname();
  const activeItem = pathname.includes("/payments")
    ? "bukti"
    : pathname.includes("/members")
      ? "anggota"
      : pathname.includes("/paket")
        ? "paket"
        : pathname.includes("/bayar")
          ? "bayar"
          : "ringkasan";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_right,_rgba(224,231,255,0.72)_0,_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(209,250,229,0.72)_0,_transparent_26%),#f7f4ee] px-4 py-4 pb-24 sm:px-6 lg:px-8 lg:py-6 lg:pb-8">
      <div className="mx-auto grid w-full max-w-7xl gap-5 lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <Card className="sticky top-6 gap-0 border-white/90 bg-white/88 py-0 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3 p-5">
              <BrandMark className="size-10" />
              <div>
                <p className="font-semibold text-zinc-950">MyArisan</p>
                <p className="text-xs text-zinc-500">Halaman Arisan</p>
              </div>
            </div>
            <Separator />
            <nav className="space-y-1 p-3">
              {desktopItems(arisanId, role).map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                      item.id === activeItem
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950",
                    )}
                    href={item.href}
                    key={item.id}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <Separator />
            <Link
              className="m-3 flex h-10 items-center justify-center rounded-lg border bg-white px-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
              href="/app/select-arisan"
            >
              Ganti Arisan
            </Link>
          </Card>
        </aside>

        <div className="min-w-0 space-y-4 md:space-y-5">
          <header className="flex h-10 items-center justify-between lg:hidden">
            <div className="flex items-center gap-3">
              <BrandMark className="size-9" />
              <div>
                <p className="text-sm font-semibold text-zinc-950">MyArisan</p>
                <p className="text-xs text-zinc-500">
                  {role === "admin" ? "Admin Arisan" : "Anggota Arisan"}
                </p>
              </div>
            </div>
          </header>
          {children}
        </div>
      </div>

      <MobileBottomNav activeItem={activeItem} arisanId={arisanId} role={role} />
    </main>
  );
}


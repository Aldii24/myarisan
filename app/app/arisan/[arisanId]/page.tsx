import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileDown,
  FileSpreadsheet,
  Landmark,
  Package as PackageIcon,
  ReceiptText,
  Settings,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  buildRecapText,
  formatDateLabel,
  formatDateTimeLabel,
  formatRupiah,
  getArisanDashboardData,
  getJoinShareText,
  getMemberDashboardData,
  isPaidStatus,
  paymentStatusLabel,
} from "@/lib/arisan";
import { requireArisanMembership } from "@/lib/auth/user";
import { getExportCapabilities, getPackageStatus } from "@/lib/subscription";
import { cn } from "@/lib/utils";

import { logoutAction } from "../../actions";
import { CopyShareText } from "./copy-share-text";

function statusBadgeClass(status: string) {
  const normalized = status.toLocaleLowerCase("id-ID");

  if (normalized.includes("sudah") || normalized.includes("aktif")) {
    return "border-success-border bg-success-surface text-success-foreground";
  }

  if (normalized.includes("menunggu")) {
    return "border-warning-border bg-warning-surface text-warning-foreground";
  }

  if (normalized.includes("ditolak") || normalized.includes("expired")) {
    return "border-danger-border bg-danger-surface text-danger-foreground";
  }

  return "border-border bg-muted text-muted-foreground";
}

function NotFoundCard() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md bg-card shadow-sm">
        <CardHeader>
          <BrandMark />
          <CardTitle className="mt-3 text-xl">Arisan tidak ditemukan</CardTitle>
          <CardDescription>
            Buka kembali daftar arisan untuk memilih halaman yang tersedia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            className={cn(buttonVariants({ variant: "default" }), "w-full")}
            href="/app/select-arisan"
          >
            Pilih Arisan
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function DesktopHeader({
  arisanName,
  joinCode,
  primaryAction,
  role,
}: {
  arisanName: string;
  joinCode: string;
  primaryAction: React.ReactNode;
  role: "Admin" | "Anggota";
}) {
  return (
    <Card className="hidden shadow-sm lg:flex">
      <CardHeader className="p-6">
        <div className="flex items-center gap-2">
          <Badge
            className={role === "Admin" ? "bg-primary text-primary-foreground" : ""}
            variant={role === "Admin" ? "default" : "secondary"}
          >
            {role}
          </Badge>
          <Badge variant="outline">Kode {joinCode}</Badge>
        </div>
        <CardTitle className="mt-2 text-3xl font-semibold tracking-tight">
          {arisanName}
        </CardTitle>
        <CardDescription>
          Ringkasan periode aktif dan status pembayaran arisan.
        </CardDescription>
        <CardAction className="flex items-center gap-2">{primaryAction}</CardAction>
      </CardHeader>
    </Card>
  );
}

async function AdminDashboard({
  arisanId,
  displayName,
}: {
  arisanId: string;
  displayName: string;
}) {
  const dashboard = await getArisanDashboardData(arisanId);

  if (!dashboard) {
    return <NotFoundCard />;
  }

  const [packageStatus, exportCapabilities] = await Promise.all([
    getPackageStatus(arisanId),
    getExportCapabilities(arisanId),
  ]);
  const unpaidCount = Math.max(dashboard.memberCount - dashboard.paidCount, 0);
  const shareText = getJoinShareText(dashboard.group.joinCode);
  const recapText = buildRecapText({
    arisanName: dashboard.group.name,
    drawMemberName: dashboard.drawMemberName,
    paidCount: dashboard.paidCount,
    pendingCount: dashboard.pendingCount,
    periodName: dashboard.activePeriod?.name,
    totalCollected: dashboard.totalCollected,
    unpaidMembers: dashboard.unpaidMembers,
  });
  const paidProgress =
    dashboard.memberCount > 0
      ? Math.round((dashboard.paidCount / dashboard.memberCount) * 100)
      : 0;
  const metrics = [
    {
      icon: CheckCircle2,
      label: "Sudah Bayar",
      value: dashboard.paidCount,
      tone: "text-success-foreground",
    },
    {
      icon: Users,
      label: "Belum Bayar",
      value: unpaidCount,
      tone: "text-muted-foreground",
    },
    {
      icon: Clock3,
      label: "Menunggu Dicek",
      value: dashboard.pendingCount,
      tone: "text-warning-foreground",
    },
    {
      icon: CircleDollarSign,
      label: "Total Terkumpul",
      value: formatRupiah(dashboard.totalCollected),
      tone: "text-info-foreground",
    },
  ];

  return (
    <>

          <DesktopHeader
            arisanName={dashboard.group.name}
            joinCode={dashboard.group.joinCode}
            role="Admin"
            primaryAction={
              <>
                <Link
                  className={buttonVariants({ variant: "default" })}
                  href={`/app/arisan/${arisanId}/payments`}
                >
                  <ReceiptText />
                  Konfirmasi Bukti
                </Link>
                <form action={logoutAction}>
                  <Button type="submit" variant="outline">
                  Keluar
                  </Button>
                </form>
              </>
            }
          />

          <Card className="border-0 bg-[linear-gradient(135deg,#0f5f4a_0%,#157a5f_52%,#1d8065_100%)] text-white shadow-xl shadow-emerald-900/25 ring-0 lg:hidden">
            <CardHeader className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge className="border-white/20 bg-white/15 text-white">
                    Admin
                  </Badge>
                  <CardTitle className="mt-3 text-xl font-semibold text-white">
                    {dashboard.group.name}
                  </CardTitle>
                  <CardDescription className="mt-1 text-white/70">
                    Kode {dashboard.group.joinCode}
                  </CardDescription>
                </div>
                <WalletCards className="size-7 text-white/75" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-white/65">Total terkumpul</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatRupiah(dashboard.totalCollected)}
                  </p>
                </div>
                <Link
                  className={cn(
                    buttonVariants({ size: "sm", variant: "secondary" }),
                    "bg-white text-emerald-800 hover:bg-white/90",
                  )}
                  href={`/app/arisan/${arisanId}/payments`}
                >
                  Cek Bukti
                  <ArrowRight />
                </Link>
              </div>
              <div className="mt-4">
                <div className="mb-2 flex justify-between text-xs text-white/70">
                  <span>{dashboard.paidCount} anggota sudah bayar</span>
                  <span>{paidProgress}%</span>
                </div>
                <Progress
                  className="[&_[data-slot=progress-indicator]]:bg-white [&_[data-slot=progress-track]]:bg-white/20"
                  value={paidProgress}
                />
              </div>
            </CardContent>
          </Card>

          {packageStatus.isExpiredPaid ? (
            <Alert className="border-warning-border bg-warning-surface">
              <PackageIcon className="text-warning-foreground" />
              <AlertTitle className="text-warning-foreground">Paket sudah habis</AlertTitle>
              <AlertDescription className="text-warning-foreground">
                Data tetap aman, tapi fitur bukti otomatis dikunci sampai paket
                diperpanjang.
              </AlertDescription>
            </Alert>
          ) : null}
          {packageStatus.isNearExpiry ? (
            <Alert className="border-warning-border bg-warning-surface">
              <Clock3 className="text-warning-foreground" />
              <AlertTitle className="text-warning-foreground">Paket hampir habis</AlertTitle>
              <AlertDescription className="text-warning-foreground">
                Perpanjang paket supaya baca bukti otomatis tetap aktif.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {metrics.map((item) => {
              const Icon = item.icon;

              return (
                <Card
                  className="rounded-xl border border-border bg-card p-4 shadow-sm ring-0"
                  key={item.label}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {item.label}
                    </p>
                    <Icon className={cn("size-4", item.tone)} />
                  </div>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                    {item.value}
                  </p>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="bg-card shadow-sm">
              <CardHeader className="p-4 md:p-6">
                <CardTitle>Ringkasan Arisan</CardTitle>
                <CardDescription>
                  Periode aktif dan status arisan bulan ini.
                </CardDescription>
                <CardAction>
                  <Badge
                    className={statusBadgeClass(
                      packageStatus.status === "aktif"
                        ? "Aktif"
                        : packageStatus.status === "expired"
                          ? "Expired"
                          : "Gratis",
                    )}
                    variant="outline"
                  >
                    {packageStatus.status === "aktif"
                      ? "Aktif"
                      : packageStatus.status === "expired"
                        ? "Expired"
                        : "Gratis"}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 md:px-6 md:pb-6">
                {[
                  {
                    icon: CircleDollarSign,
                    label: "Setoran",
                    value: formatRupiah(dashboard.group.amountPerPeriod),
                  },
                  {
                    icon: CalendarDays,
                    label: "Periode aktif",
                    value: dashboard.activePeriod?.name ?? "Belum ada",
                  },
                  {
                    icon: Users,
                    label: "Jumlah anggota",
                    value: dashboard.memberCount,
                  },
                  {
                    icon: Clock3,
                    label: "Aktif Sampai",
                    value: formatDateTimeLabel(packageStatus.activeUntil),
                  },
                ].map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label}>
                      {index > 0 ? <Separator className="mb-4" /> : null}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-success-surface text-success-foreground">
                            <Icon className="size-4" />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-right text-sm font-semibold text-foreground">
                          {item.value}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm">
              <CardHeader className="p-4 md:p-6">
                <CardTitle>Aksi Cepat</CardTitle>
                <CardDescription>
                  Kelola anggota dan pembayaran arisan.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 px-4 pb-4 md:gap-3 md:px-6 md:pb-6">
                {[
                  {
                    href: `/app/arisan/${arisanId}/members`,
                    icon: UserPlus,
                    label: "Tambah Anggota",
                  },
                  {
                    href: `/app/arisan/${arisanId}/giliran`,
                    icon: CalendarClock,
                    label: "Atur Giliran",
                  },
                  {
                    href: `/app/arisan/${arisanId}/payments`,
                    icon: ReceiptText,
                    label: "Konfirmasi Bukti",
                  },
                  {
                    href: `/app/arisan/${arisanId}/paket`,
                    icon: PackageIcon,
                    label: "Paket",
                  },
                  {
                    href: `/app/arisan/${arisanId}/pengaturan`,
                    icon: Settings,
                    label: "Pengaturan",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-auto min-h-20 flex-col gap-2 whitespace-normal p-3 text-center",
                      )}
                      href={item.href}
                      key={item.label}
                    >
                      <Icon className="size-5 text-primary" />
                      {item.label}
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="bg-card shadow-sm" id="rekap">
              <CardHeader className="p-4 md:p-6">
                <CardTitle>Rekap</CardTitle>
                <CardDescription>
                  Ringkasan pembayaran siap disalin ke grup.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 md:px-6 md:pb-6">
                <CopyShareText text={recapText} />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Export rekap
                  </p>
                  {exportCapabilities.pdf || exportCapabilities.excel ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {exportCapabilities.pdf ? (
                        <a
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                            "w-full",
                          )}
                          href={`/api/arisan/${arisanId}/export?format=pdf`}
                        >
                          <FileDown />
                          PDF
                        </a>
                      ) : null}
                      {exportCapabilities.excel ? (
                        <a
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                            "w-full",
                          )}
                          href={`/api/arisan/${arisanId}/export?format=excel`}
                        >
                          <FileSpreadsheet />
                          Excel
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                  {!exportCapabilities.excel ? (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {exportCapabilities.pdf
                        ? "Export Excel tersedia di paket Pro dan Premium."
                        : "Export PDF dan Excel tersedia di paket berbayar."}{" "}
                      <Link
                        className="font-medium text-primary underline-offset-2 hover:underline"
                        href={`/app/arisan/${arisanId}/paket`}
                      >
                        Lihat Paket
                      </Link>
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm" id="kode-join">
              <CardHeader className="p-4 md:p-6">
                <CardTitle>Salin ke Grup</CardTitle>
                <CardDescription>
                  Bagikan kode join kepada anggota.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 md:pb-6">
                <CopyShareText text={shareText} />
              </CardContent>
            </Card>
          </div>

          <p className="pb-2 text-center text-xs text-muted-foreground lg:text-left">
            Masuk sebagai {displayName}.
          </p>
    </>
  );
}

async function MemberDashboard({
  arisanId,
  displayName,
  userId,
}: {
  arisanId: string;
  displayName: string;
  userId: string;
}) {
  const dashboard = await getMemberDashboardData(arisanId, userId);

  if (!dashboard) {
    return <NotFoundCard />;
  }

  const statusLabel = paymentStatusLabel(dashboard.paymentStatus);
  const canSendProof =
    !dashboard.payment || dashboard.payment.status === "rejected";
  const metrics = [
    {
      icon: CircleDollarSign,
      label: "Setoran",
      value: formatRupiah(dashboard.group.amountPerPeriod),
    },
    {
      icon: CalendarDays,
      label: "Batas Setor",
      value: formatDateLabel(dashboard.activePeriod?.dueDate),
    },
    {
      icon: Users,
      label: "Giliran",
      value: dashboard.drawMemberName ?? "Belum diatur",
    },
    {
      icon: Clock3,
      label: "Periode",
      value: dashboard.activePeriod?.name ?? "-",
    },
  ];

  return (
    <>

          <DesktopHeader
            arisanName={dashboard.group.name}
            joinCode={dashboard.group.joinCode}
            role="Anggota"
            primaryAction={
              <>
                {canSendProof ? (
                  <Link
                    className={buttonVariants({ variant: "default" })}
                    href={`/app/arisan/${arisanId}/bayar`}
                  >
                    <WalletCards />
                    Kirim Bukti
                  </Link>
                ) : null}
                <form action={logoutAction}>
                  <Button type="submit" variant="outline">
                    Keluar
                  </Button>
                </form>
              </>
            }
          />

          <Card className="border-0 bg-[linear-gradient(135deg,#0f5f4a_0%,#157a5f_52%,#1d8065_100%)] text-white shadow-xl shadow-emerald-900/25 ring-0">
            <CardHeader className="p-4 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge className="border-white/20 bg-white/15 text-white">
                    {statusLabel}
                  </Badge>
                  <CardTitle className="mt-3 text-xl font-semibold text-white md:text-2xl">
                    {dashboard.group.name}
                  </CardTitle>
                  <CardDescription className="mt-1 text-white/70">
                    {displayName} · {dashboard.activePeriod?.name ?? "Belum ada periode"}
                  </CardDescription>
                </div>
                <WalletCards className="size-7 text-white/75" />
              </div>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-4 px-4 pb-4 md:px-6 md:pb-6">
              <div>
                <p className="text-xs text-white/65">Setoran periode ini</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatRupiah(dashboard.group.amountPerPeriod)}
                </p>
              </div>
              {canSendProof ? (
                <Link
                  className={cn(
                    buttonVariants({ size: "sm", variant: "secondary" }),
                    "bg-white text-emerald-800 hover:bg-white/90",
                  )}
                  href={`/app/arisan/${arisanId}/bayar`}
                >
                  Kirim Bukti
                  <ArrowRight />
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {metrics.map((item) => {
              const Icon = item.icon;

              return (
                <Card
                  className="rounded-xl border border-border bg-card p-4 shadow-sm ring-0"
                  key={item.label}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {item.label}
                    </p>
                    <Icon className="size-4 text-primary" />
                  </div>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-foreground md:text-xl">
                    {item.value}
                  </p>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="bg-card shadow-sm">
              <CardHeader className="p-4 md:p-6">
                <CardTitle>Rekening Admin</CardTitle>
                <CardDescription>
                  Transfer setoran ke rekening atau e-wallet berikut.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 md:pb-6">
                <div className="flex gap-3 rounded-xl bg-success-surface p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-success-foreground shadow-sm">
                    <Landmark className="size-5" />
                  </div>
                  <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-success-foreground">
                    {dashboard.group.bankAccountText ?? "Belum diisi"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm">
              <CardHeader className="p-4 md:p-6">
                <CardTitle>Status Pembayaran</CardTitle>
                <CardAction>
                  <Badge
                    className={statusBadgeClass(statusLabel)}
                    variant="outline"
                  >
                    {statusLabel}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-3 px-4 pb-4 md:px-6 md:pb-6">
                {canSendProof ? (
                  <Link
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "w-full",
                    )}
                    href={`/app/arisan/${arisanId}/bayar`}
                  >
                    <WalletCards />
                    Kirim Bukti
                  </Link>
                ) : null}
                {dashboard.payment?.status === "pending" ? (
                  <Alert className="border-warning-border bg-warning-surface">
                    <Clock3 className="text-warning-foreground" />
                    <AlertDescription className="text-warning-foreground">
                      Bukti kamu sedang dicek admin.
                    </AlertDescription>
                  </Alert>
                ) : null}
                {isPaidStatus(dashboard.payment?.status) ? (
                  <Alert className="border-success-border bg-success-surface">
                    <CheckCircle2 className="text-success-foreground" />
                    <AlertDescription className="text-success-foreground">
                      Pembayaran kamu sudah diterima admin.
                    </AlertDescription>
                  </Alert>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    className={buttonVariants({ variant: "outline" })}
                    href={`/app/arisan/${arisanId}/riwayat`}
                  >
                    Riwayat Bayar
                  </Link>
                  <Link
                    className={buttonVariants({ variant: "outline" })}
                    href={`/app/arisan/${arisanId}/giliran`}
                  >
                    Lihat Giliran
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
    </>
  );
}

export default async function ArisanDashboardPage({
  params,
}: {
  params: Promise<{ arisanId: string }>;
}) {
  const { arisanId } = await params;
  const { user, membership } = await requireArisanMembership(arisanId);

  if (membership.role === "admin") {
    return (
      <AdminDashboard
        arisanId={arisanId}
        displayName={membership.displayName}
      />
    );
  }

  return (
    <MemberDashboard
      arisanId={arisanId}
      displayName={membership.displayName}
      userId={user.id}
    />
  );
}

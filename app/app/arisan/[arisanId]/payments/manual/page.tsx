import {
  ButtonLink,
  EmptyState,
  GlassPanel,
} from "@/components/ui/app-ui";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { formatRupiah, getArisanDashboardData } from "@/lib/arisan";
import { requireArisanAdmin } from "@/lib/auth/user";
import { getManualPaymentMembers } from "@/lib/payments/manual-payment";
import { canUseAutomaticProof, isSubscriptionExpired } from "@/lib/subscription";

import { ManualPaymentForm } from "./manual-payment-form";

export default async function ManualPaymentPage({
  params,
}: {
  params: Promise<{ arisanId: string }>;
}) {
  const { arisanId } = await params;
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return (
      <>
        <DashboardHeader
          actions={<ButtonLink href={`/app/arisan/${arisanId}`}>Kembali</ButtonLink>}
          eyebrow="Tidak Bisa Akses"
          title="Hanya admin arisan"
        />
        <EmptyState title="Tidak Bisa Akses">
          Hanya admin arisan yang bisa mencatat pembayaran manual.
        </EmptyState>
      </>
    );
  }

  const dashboard = await getArisanDashboardData(arisanId);

  if (!dashboard) {
    return (
      <>
        <DashboardHeader
          actions={
            <ButtonLink href={`/app/arisan/${arisanId}/payments`}>Kembali</ButtonLink>
          }
          eyebrow="Catat Manual"
          title="Arisan tidak ditemukan"
        />
        <EmptyState title="Arisan tidak ditemukan">
          Buka kembali daftar arisan untuk memilih halaman yang tersedia.
        </EmptyState>
      </>
    );
  }

  const [members, proofGate, expired] = await Promise.all([
    getManualPaymentMembers(arisanId),
    canUseAutomaticProof(arisanId),
    isSubscriptionExpired(arisanId),
  ]);
  const quotaExhausted = !proofGate.allowed && proofGate.reason === "quota";

  return (
    <>
      <DashboardHeader
        actions={
          <ButtonLink href={`/app/arisan/${arisanId}/payments`}>Kembali</ButtonLink>
        }
        eyebrow="Catat Manual"
        subtitle="Catat pembayaran anggota tanpa upload bukti. Berguna saat kuota baca bukti otomatis habis."
        title={dashboard.group.name}
      />

      {expired ? (
        <div className="rounded-3xl border border-red-200/80 bg-red-50/90 p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-900">
            Paket arisan sudah habis.
          </p>
          <p className="mt-1 text-sm leading-6 text-red-800">
            Mencatat pembayaran baru dikunci sampai paket diperpanjang. Data lama
            tetap bisa dilihat.
          </p>
          <ButtonLink
            className="mt-3 inline-flex"
            href={`/app/arisan/${arisanId}/paket`}
          >
            Perpanjang Paket
          </ButtonLink>
        </div>
      ) : quotaExhausted ? (
        <div className="rounded-3xl border border-amber-200/80 bg-amber-50/90 p-4 shadow-sm">
          <p className="text-sm font-semibold text-amber-950">
            Kuota baca bukti otomatis bulan ini habis.
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            Pembayaran tetap bisa dicatat manual dari halaman ini. Upgrade paket
            untuk menambah kuota bukti otomatis.
          </p>
          <ButtonLink
            className="mt-3 inline-flex"
            href={`/app/arisan/${arisanId}/paket`}
          >
            Lihat Paket
          </ButtonLink>
        </div>
      ) : null}

      <GlassPanel className="p-5" variant="elevated">
        {expired ? (
          <EmptyState title="Paket sudah habis">
            Perpanjang paket arisan dulu untuk mencatat pembayaran baru.
          </EmptyState>
        ) : !dashboard.activePeriod ? (
          <EmptyState title="Belum ada periode aktif">
            Buat periode aktif dulu sebelum mencatat pembayaran.
          </EmptyState>
        ) : members.length === 0 ? (
          <EmptyState title="Belum ada anggota bergabung">
            Pembayaran manual hanya bisa untuk anggota yang sudah bergabung lewat
            kode join. Ajak anggota bergabung dulu.
          </EmptyState>
        ) : (
          <>
            <div className="mb-5 rounded-2xl border border-white/60 bg-white/45 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Periode aktif
              </p>
              <p className="mt-1 font-semibold text-zinc-950">
                {dashboard.activePeriod.name} · Setoran{" "}
                {formatRupiah(dashboard.group.amountPerPeriod)}
              </p>
            </div>
            <ManualPaymentForm
              arisanId={arisanId}
              defaultAmount={dashboard.group.amountPerPeriod}
              members={members}
            />
          </>
        )}
      </GlassPanel>
    </>
  );
}

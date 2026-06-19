import {
  ButtonLink,
  GlassPanel,
  MetricCard,
  StatusBadge,
} from "@/components/ui/app-ui";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  formatDateLabel,
  formatRupiah,
  getMemberPaymentUploadData,
  paymentStatusLabel,
} from "@/lib/arisan";
import { requireArisanMembership } from "@/lib/auth/user";
import { canUseAutomaticProof } from "@/lib/subscription";

import { UploadPaymentForm } from "./upload-payment-form";

export default async function BayarPage({
  params,
}: {
  params: Promise<{ arisanId: string }>;
}) {
  const { arisanId } = await params;
  const { user, membership } = await requireArisanMembership(arisanId);

  if (membership.role === "admin") {
    return (
      <>
        <DashboardHeader
          actions={
          <ButtonLink href={`/app/arisan/${arisanId}/payments`} variant="primary">
            Buka Konfirmasi Bukti
          </ButtonLink>
          }
          eyebrow="Konfirmasi Bukti"
          subtitle="Admin mengecek bukti pembayaran dari halaman khusus."
          title="Cek pembayaran anggota"
        />
        <GlassPanel>
          <p className="text-sm leading-6 text-zinc-600">
            Halaman Kirim Bukti dipakai anggota untuk mengirim bukti setor. Untuk
            admin, lanjutkan ke halaman Konfirmasi Bukti agar semua setoran bisa
            dicek rapi.
          </p>
        </GlassPanel>
      </>
    );
  }

  const data = await getMemberPaymentUploadData(arisanId, user.id);

  if (!data) {
    return null;
  }

  const canUpload = !data.payment || data.payment.status === "rejected";
  const uploadGate = canUpload ? await canUseAutomaticProof(arisanId) : null;
  const gateMessage =
    uploadGate && !uploadGate.allowed
      ? uploadGate.reason === "expired"
        ? "Paket arisan ini belum aktif. Hubungi admin arisan agar bukti bisa diproses."
        : "Kuota baca bukti otomatis bulan ini habis. Pembayaran masih bisa dicatat manual oleh admin dari dashboard."
      : null;
  const statusLabel = paymentStatusLabel(data.paymentStatus);

  return (
    <>
      <DashboardHeader
        actions={<ButtonLink href={`/app/arisan/${arisanId}`}>Kembali</ButtonLink>}
        eyebrow="Kirim Bukti"
        subtitle="Upload bukti transfer untuk periode aktif. Admin tetap mengecek manual sebelum menandai Sudah Bayar."
        title={data.group.name}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accent={
            statusLabel === "Ditolak"
              ? "red"
              : statusLabel === "Menunggu Dicek"
                ? "amber"
                : "emerald"
          }
          label="Status Kamu"
          value={<StatusBadge status={statusLabel} />}
        />
        <MetricCard
          label="Setoran"
          value={formatRupiah(data.group.amountPerPeriod)}
        />
        <MetricCard
          accent="neutral"
          label="Periode"
          value={data.activePeriod?.name ?? "Belum ada"}
        />
        <MetricCard
          accent="amber"
          label="Batas Setor"
          value={formatDateLabel(data.activePeriod?.dueDate)}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <GlassPanel>
          <h2 className="text-lg font-semibold text-zinc-950">Rekening Admin</h2>
          <p className="mt-3 whitespace-pre-wrap rounded-3xl border border-white/60 bg-white/45 p-4 text-sm leading-6 text-zinc-700">
            {data.group.bankAccountText ?? "Belum diisi"}
          </p>
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            Pastikan nominal sesuai setoran arisan, lalu kirim bukti yang jelas.
            Gambar akan dicek admin sebelum status berubah menjadi Sudah Bayar.
          </p>
        </GlassPanel>

        <GlassPanel variant="elevated">
          <h2 className="text-lg font-semibold text-zinc-950">Upload Bukti</h2>
          <div className="mt-4">
            {gateMessage ? (
              <p className="rounded-3xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm font-semibold leading-6 text-amber-900">
                {gateMessage}
              </p>
            ) : canUpload ? (
              <UploadPaymentForm
                arisanId={arisanId}
                defaultAmount={data.group.amountPerPeriod}
              />
            ) : (
              <p className="rounded-3xl border border-white/60 bg-white/45 p-4 text-sm leading-6 text-zinc-600">
                {data.payment?.status === "pending" ||
                data.payment?.status === "duplicate_check"
                  ? "Bukti kamu sedang dicek admin."
                  : "Pembayaran periode ini sudah diterima admin."}
              </p>
            )}
          </div>
        </GlassPanel>
      </div>
    </>
  );
}

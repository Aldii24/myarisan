import Link from "next/link";

import {
  ButtonLink,
  EmptyState,
  GlassPanel,
  MetricCard,
  StatusBadge,
} from "@/components/ui/app-ui";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  formatDateTimeLabel,
  formatRupiah,
  getAdminPayments,
  paymentStatusLabel,
} from "@/lib/arisan";
import { requireArisanAdmin } from "@/lib/auth/user";

type PaymentCard = Awaited<ReturnType<typeof getAdminPayments>>[number];

function getAiWarnings(aiResult: PaymentCard["aiResultJson"]) {
  const warnings = aiResult?.warnings;

  return Array.isArray(warnings)
    ? warnings.filter((warning): warning is string => typeof warning === "string")
    : [];
}

function PaymentSection({
  accent = "neutral",
  arisanId,
  emptyText,
  payments,
  title,
}: {
  accent?: "amber" | "emerald" | "neutral" | "red";
  arisanId: string;
  emptyText: string;
  payments: PaymentCard[];
  title: string;
}) {
  return (
    <GlassPanel className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
        <MetricCard accent={accent} label="Jumlah" value={payments.length} />
      </div>

      {payments.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Kosong">{emptyText}</EmptyState>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {payments.map((payment) => {
            const warnings = getAiWarnings(payment.aiResultJson);

            return (
              <Link
                className="group rounded-3xl border border-white/60 bg-white/45 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/75"
                href={`/app/arisan/${arisanId}/payments/${payment.id}`}
                key={payment.id}
              >
                <div className="flex gap-4">
                  {payment.proofImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`Bukti bayar ${payment.memberName ?? "anggota"}`}
                      className="h-24 w-24 shrink-0 rounded-2xl border border-white/70 object-cover shadow-sm"
                      src={`/api/files/payment-proof/${payment.id}`}
                    />
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/40 text-xs font-semibold text-zinc-500">
                      Bukti
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-950">
                          {payment.memberName ?? "Anggota"}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          {payment.periodName}
                        </p>
                      </div>
                      <StatusBadge status={paymentStatusLabel(payment.status)} />
                    </div>
                    <p className="mt-3 text-lg font-semibold text-zinc-950">
                      {formatRupiah(payment.amount ?? 0)}
                    </p>
                    {payment.note ? (
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600">
                        {payment.note}
                      </p>
                    ) : null}
                    {warnings.length > 0 ? (
                      <p className="mt-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                        Perlu dicek
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs font-medium text-zinc-500">
                      {formatDateTimeLabel(payment.createdAt)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}

export default async function AdminPaymentsPage({
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
          Hanya admin arisan yang bisa membuka Konfirmasi Bukti.
        </EmptyState>
      </>
    );
  }

  const paymentRows = await getAdminPayments(arisanId);
  const pendingPayments = paymentRows.filter((payment) => payment.status === "pending");
  const confirmedPayments = paymentRows.filter(
    (payment) => payment.status === "confirmed",
  );
  const rejectedPayments = paymentRows.filter((payment) => payment.status === "rejected");

  return (
    <>
      <DashboardHeader
        actions={<ButtonLink href={`/app/arisan/${arisanId}`}>Kembali</ButtonLink>}
        eyebrow="Konfirmasi Bukti"
        subtitle="Cek bukti setor anggota satu per satu. Hasil baca otomatis hanya bantuan, keputusan tetap dari admin."
        title="Pembayaran Anggota"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          accent="amber"
          label="Menunggu Dicek"
          value={pendingPayments.length}
        />
        <MetricCard
          accent="emerald"
          label="Sudah Diterima"
          value={confirmedPayments.length}
        />
        <MetricCard accent="red" label="Ditolak" value={rejectedPayments.length} />
      </div>

      <div className="space-y-5">
        <PaymentSection
          accent="amber"
          arisanId={arisanId}
          emptyText="Belum ada bukti yang menunggu dicek."
          payments={pendingPayments}
          title="Menunggu Dicek"
        />
        <PaymentSection
          accent="emerald"
          arisanId={arisanId}
          emptyText="Belum ada pembayaran diterima."
          payments={confirmedPayments}
          title="Sudah Diterima"
        />
        <PaymentSection
          accent="red"
          arisanId={arisanId}
          emptyText="Belum ada bukti ditolak."
          payments={rejectedPayments}
          title="Ditolak"
        />
      </div>
    </>
  );
}

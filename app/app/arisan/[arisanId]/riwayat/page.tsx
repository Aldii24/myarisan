import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  ButtonLink,
  EmptyState,
  GlassPanel,
  MetricCard,
  StatusBadge,
} from "@/components/ui/app-ui";
import {
  formatDateTimeLabel,
  formatRupiah,
  getMemberPaymentHistory,
  paymentStatusLabel,
} from "@/lib/arisan";
import { requireArisanMembership } from "@/lib/auth/user";

export default async function MemberPaymentHistoryPage({
  params,
}: {
  params: Promise<{ arisanId: string }>;
}) {
  const { arisanId } = await params;
  const { user } = await requireArisanMembership(arisanId);

  const data = await getMemberPaymentHistory(arisanId, user.id);

  if (!data) {
    return (
      <>
        <DashboardHeader
          actions={<ButtonLink href={`/app/arisan/${arisanId}`}>Kembali</ButtonLink>}
          eyebrow="Riwayat Bayar"
          title="Arisan tidak ditemukan"
        />
        <EmptyState title="Tidak ada data">
          Buka kembali daftar arisan untuk memilih halaman yang tersedia.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        actions={<ButtonLink href={`/app/arisan/${arisanId}`}>Kembali</ButtonLink>}
        eyebrow="Riwayat Bayar"
        subtitle="Catatan semua bukti setor yang pernah kamu kirim di arisan ini."
        title={`Riwayat Bayar ${data.group.name}`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          accent="emerald"
          label="Total Sudah Bayar"
          value={formatRupiah(data.totalPaid)}
        />
        <MetricCard
          accent="neutral"
          label="Periode Diterima"
          value={data.confirmedCount}
        />
      </div>

      <GlassPanel className="p-5">
        <h2 className="text-lg font-semibold text-zinc-950">Daftar Setoran</h2>
        {data.payments.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Belum ada setoran">
              Bukti setor yang kamu kirim akan muncul di sini.
            </EmptyState>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {data.payments.map((payment) => (
              <div
                className="rounded-3xl border border-white/60 bg-white/45 p-4 shadow-sm backdrop-blur"
                key={payment.id}
              >
                <div className="flex gap-4">
                  {payment.proofImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`Bukti bayar ${payment.periodName}`}
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
                      <p className="font-semibold text-zinc-950">
                        {payment.periodName}
                      </p>
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
                    <p className="mt-3 text-xs font-medium text-zinc-500">
                      Dikirim {formatDateTimeLabel(payment.createdAt)}
                    </p>
                    {payment.confirmedAt ? (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        Diterima {formatDateTimeLabel(payment.confirmedAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </>
  );
}

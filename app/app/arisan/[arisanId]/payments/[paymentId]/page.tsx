import Link from "next/link";

import {
  ButtonLink,
  EmptyState,
  GlassPanel,
  MetricCard,
  StatusBadge,
  buttonStyles,
} from "@/components/ui/app-ui";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  formatDateTimeLabel,
  formatRupiah,
  getAdminPaymentDetail,
  isPaidStatus,
  paymentStatusLabel,
} from "@/lib/arisan";
import { requireArisanAdmin } from "@/lib/auth/user";
import { isSubscriptionExpired } from "@/lib/subscription";

import { confirmPaymentAction, rejectPaymentAction } from "../actions";

type PaymentDetail = NonNullable<Awaited<ReturnType<typeof getAdminPaymentDetail>>>;

function getStringValue(aiResult: PaymentDetail["aiResultJson"], key: string) {
  const value = aiResult?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumberValue(aiResult: PaymentDetail["aiResultJson"], key: string) {
  const value = aiResult?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getWarnings(aiResult: PaymentDetail["aiResultJson"]) {
  const warnings = aiResult?.warnings;

  return Array.isArray(warnings)
    ? warnings.filter((warning): warning is string => typeof warning === "string")
    : [];
}

function warningLabel(warning: string) {
  const normalized = warning.toLocaleLowerCase("id-ID");

  if (normalized.includes("nominal")) {
    return "Nominal tidak sesuai";
  }

  if (normalized.includes("sender") || normalized.includes("pengirim")) {
    return "Nama pengirim belum cocok";
  }

  if (normalized.includes("duplicate") || normalized.includes("sama")) {
    return "Kemungkinan bukti ganda";
  }

  if (normalized.includes("date") || normalized.includes("tanggal")) {
    return "Tanggal perlu dicek";
  }

  if (normalized.includes("ocr") || normalized.includes("ai")) {
    return "Perlu dicek";
  }

  return warning;
}

function ReadTile({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/45 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

export default async function PaymentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ arisanId: string; paymentId: string }>;
  searchParams: Promise<{ gate?: string }>;
}) {
  const { arisanId, paymentId } = await params;
  const { gate } = await searchParams;
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
          Hanya admin arisan yang bisa membuka detail bukti.
        </EmptyState>
      </>
    );
  }

  const payment = await getAdminPaymentDetail(arisanId, paymentId);

  if (!payment) {
    return (
      <>
        <DashboardHeader
          actions={
          <ButtonLink href={`/app/arisan/${arisanId}/payments`}>Kembali</ButtonLink>
          }
          eyebrow="Detail Bukti"
          title="Bukti tidak ditemukan"
        />
        <EmptyState title="Bukti tidak ditemukan">
          Bukti ini tidak ada di arisan yang sedang dibuka.
        </EmptyState>
      </>
    );
  }

  const detectedAmount = getNumberValue(payment.aiResultJson, "detectedAmount");
  const confidence = getNumberValue(payment.aiResultJson, "confidence") ?? 0;
  const warnings = getWarnings(payment.aiResultJson);
  const expired = await isSubscriptionExpired(arisanId);

  return (
    <>
      <DashboardHeader
        actions={
        <ButtonLink href={`/app/arisan/${arisanId}/payments`}>Kembali</ButtonLink>
        }
        eyebrow="Detail Bukti"
        subtitle={`${payment.periodName} - ${formatDateTimeLabel(payment.createdAt)}`}
        title={payment.memberName ?? "Anggota"}
      />
      {expired || gate === "expired" ? (
        <div className="rounded-3xl border border-red-200/80 bg-red-50/90 p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-900">
            Paket arisan sudah habis.
          </p>
          <p className="mt-1 text-sm leading-6 text-red-800">
            Konfirmasi pembayaran baru dikunci sampai paket diperpanjang. Data
            lama tetap bisa dilihat.
          </p>
          <ButtonLink className="mt-3 inline-flex" href={`/app/arisan/${arisanId}/paket`}>
            Perpanjang Paket
          </ButtonLink>
        </div>
      ) : null}
      {payment.status === "duplicate_check" ? (
        <div className="rounded-3xl border border-orange-200/80 bg-orange-50/90 p-4 shadow-sm">
          <p className="text-sm font-semibold text-orange-950">
            Bukti ini mirip dengan pembayaran yang sudah pernah dikirim.
          </p>
          <p className="mt-1 text-sm leading-6 text-orange-900">
            Status: perlu dicek admin. Pastikan ini bukan bukti ganda sebelum
            menerima.
          </p>
          {payment.duplicateOfPaymentId ? (
            <Link
              className="mt-2 inline-flex text-sm font-semibold text-orange-950 underline underline-offset-2"
              href={`/app/arisan/${arisanId}/payments/${payment.duplicateOfPaymentId}`}
            >
              Lihat bukti yang mirip
            </Link>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          accent={isPaidStatus(payment.status) ? "emerald" : payment.status === "rejected" ? "red" : "amber"}
          label="Status"
          value={<StatusBadge status={paymentStatusLabel(payment.status)} />}
        />
        <MetricCard
          label="Nominal"
          value={formatRupiah(payment.amount ?? 0)}
        />
        <MetricCard
          accent={warnings.length > 0 ? "amber" : "neutral"}
          label="Baca Otomatis"
          value={`${Math.round(confidence * 100)}%`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <GlassPanel className="p-4 lg:p-5" variant="elevated">
          {payment.proofImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`Bukti bayar ${payment.memberName ?? "anggota"}`}
              className="max-h-[640px] w-full rounded-[1.25rem] object-contain"
              src={`/api/files/payment-proof/${payment.id}`}
            />
          ) : (
            <p className="rounded-3xl border border-dashed border-zinc-300 bg-white/35 p-6 text-sm text-zinc-600">
              Tidak ada gambar bukti.
            </p>
          )}
        </GlassPanel>

        <div className="space-y-5">
          <GlassPanel>
            <h2 className="text-lg font-semibold text-zinc-950">Rincian Bukti</h2>
            <div className="mt-4 grid gap-3">
              <ReadTile
                label="Status"
                value={<StatusBadge status={paymentStatusLabel(payment.status)} />}
              />
              <ReadTile
                label="Nominal dari anggota"
                value={formatRupiah(payment.amount ?? 0)}
              />
              {payment.note ? (
                <ReadTile
                  label="Catatan"
                  value={
                    <span className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                      {payment.note}
                    </span>
                  }
                />
              ) : null}
            </div>
          </GlassPanel>

          <GlassPanel>
            <h2 className="text-lg font-semibold text-zinc-950">
              Baca Bukti Otomatis
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Hasil ini hanya bantu admin mengecek. Pembayaran tetap harus
              diterima manual.
            </p>
            {payment.aiResultJson ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ReadTile
                  label="Nominal terbaca"
                  value={detectedAmount ? formatRupiah(detectedAmount) : "Tidak terbaca"}
                />
                <ReadTile
                  label="Tanggal terbaca"
                  value={
                    getStringValue(payment.aiResultJson, "detectedDate") ??
                    "Tidak terbaca"
                  }
                />
                <ReadTile
                  label="Nama pengirim terbaca"
                  value={
                    getStringValue(payment.aiResultJson, "detectedSenderName") ??
                    "Tidak terbaca"
                  }
                />
                <ReadTile
                  label="Bank/e-wallet terbaca"
                  value={
                    getStringValue(payment.aiResultJson, "detectedBankOrWallet") ??
                    "Tidak terbaca"
                  }
                />
                <ReadTile
                  label="Cocok dengan anggota"
                  value={
                    getStringValue(payment.aiResultJson, "matchedMemberName") ??
                    "Perlu dicek"
                  }
                />
                <ReadTile
                  label="Tingkat keyakinan"
                  value={`${Math.round(confidence * 100)}%`}
                />
                <div className="sm:col-span-2">
                  <ReadTile
                    label="Catatan"
                    value={
                      getStringValue(payment.aiResultJson, "notes") ??
                      "Tidak ada catatan"
                    }
                  />
                </div>
                {warnings.length > 0 ? (
                  <div className="rounded-3xl border border-amber-200/80 bg-amber-50/90 p-4 sm:col-span-2">
                    <p className="text-sm font-semibold text-amber-950">
                      Catatan/peringatan
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-900">
                      {warnings.map((warning) => (
                        <li key={warning}>{warningLabel(warning)}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 rounded-3xl border border-dashed border-zinc-300 bg-white/35 p-4 text-sm leading-6 text-zinc-600">
                Belum ada hasil baca otomatis.
              </p>
            )}
            <details className="mt-4 rounded-3xl border border-white/60 bg-white/45 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
                Bacaan lengkap
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                {payment.ocrText?.trim() || "Tidak ada teks terbaca."}
              </p>
            </details>
          </GlassPanel>

          <GlassPanel variant="elevated">
            <h2 className="text-lg font-semibold text-zinc-950">Aksi Admin</h2>
            <form
              action={confirmPaymentAction.bind(null, arisanId, paymentId)}
              className="mt-4 space-y-3"
            >
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-800" htmlFor="amount">
                  Edit nominal jika perlu
                </label>
                <input
                  className="h-12 w-full rounded-2xl border border-white/70 bg-white/70 px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  defaultValue={payment.amount ?? 0}
                  id="amount"
                  inputMode="numeric"
                  name="amount"
                  required
                />
              </div>
              <button
                className={`${buttonStyles.primary} w-full`}
                disabled={expired}
                type="submit"
              >
                Terima
              </button>
              {expired ? (
                <p className="text-xs leading-5 text-red-700">
                  Perpanjang paket dulu untuk konfirmasi pembayaran.
                </p>
              ) : null}
            </form>

            <form
              action={rejectPaymentAction.bind(null, arisanId, paymentId)}
              className="mt-3"
            >
              <button className={`${buttonStyles.danger} w-full`} type="submit">
                Tolak
              </button>
            </form>
          </GlassPanel>
        </div>
      </div>
    </>
  );
}

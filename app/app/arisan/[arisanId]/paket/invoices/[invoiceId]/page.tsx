import { and, eq } from "drizzle-orm";

import {
  ButtonLink,
  EmptyState,
  GlassPanel,
  MetricCard,
  StatusBadge,
} from "@/components/ui/app-ui";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { db } from "@/db";
import { arisanGroups, invoices, plans } from "@/db/schema";
import { formatDateTimeLabel, formatRupiah } from "@/lib/arisan";
import { requireArisanAdmin } from "@/lib/auth/user";
import { qrisImageSrc } from "@/lib/payments/qris";

import { InvoiceProofForm } from "../../invoice-proof-form";

function invoiceStatusLabel(status: string) {
  if (status === "pending_verification") {
    return "Menunggu Dicek";
  }

  if (status === "paid") {
    return "Sudah Dibayar";
  }

  if (status === "rejected") {
    return "Ditolak";
  }

  if (status === "expired") {
    return "Expired";
  }

  return "Belum Dibayar";
}

export default async function PackageInvoicePage({
  params,
}: {
  params: Promise<{ arisanId: string; invoiceId: string }>;
}) {
  const { arisanId, invoiceId } = await params;
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
          Hanya admin arisan yang bisa membuka tagihan paket.
        </EmptyState>
      </>
    );
  }

  const [invoice] = await db
    .select({
      amount: invoices.amount,
      arisanName: arisanGroups.name,
      createdAt: invoices.createdAt,
      id: invoices.id,
      paidAt: invoices.paidAt,
      planName: plans.name,
      proofImageUrl: invoices.proofImageUrl,
      status: invoices.status,
    })
    .from(invoices)
    .innerJoin(plans, eq(plans.id, invoices.planId))
    .innerJoin(arisanGroups, eq(arisanGroups.id, invoices.arisanGroupId))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.arisanGroupId, arisanId)))
    .limit(1);

  if (!invoice) {
    return (
      <>
        <DashboardHeader
          actions={
            <ButtonLink href={`/app/arisan/${arisanId}/paket`}>Kembali</ButtonLink>
          }
          eyebrow="Tagihan Paket"
          title="Tagihan tidak ditemukan"
        />
        <EmptyState title="Tagihan tidak ditemukan">
          Tagihan paket ini tidak ada di arisan yang sedang dibuka.
        </EmptyState>
      </>
    );
  }

  const qrisImageUrl = qrisImageSrc();
  const canUpload = invoice.status === "pending" || invoice.status === "rejected";
  const proofImageUrl = invoice.proofImageUrl
    ? `/api/files/invoice-proof/${invoice.id}`
    : null;

  return (
    <>
      <DashboardHeader
        actions={
          <ButtonLink href={`/app/arisan/${arisanId}/paket`}>Kembali</ButtonLink>
        }
        eyebrow="Bayar Paket"
        subtitle={`${invoice.arisanName} - ${invoiceStatusLabel(invoice.status)}`}
        title={invoice.planName}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Harga" value={formatRupiah(invoice.amount)} />
        <MetricCard accent="neutral" label="Masa Aktif" value="30 hari" />
        <MetricCard
          accent={invoice.status === "paid" ? "emerald" : invoice.status === "rejected" ? "red" : "amber"}
          label="Status"
          value={<StatusBadge status={invoiceStatusLabel(invoice.status)} />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
        <GlassPanel variant="elevated">
          <h2 className="text-lg font-semibold text-foreground">QRIS MyArisan</h2>
          {qrisImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="QRIS MyArisan"
              className="mt-4 w-full rounded-[1.25rem] border border-border bg-card object-contain p-3 shadow-sm"
              src={qrisImageUrl}
            />
          ) : (
            <p className="mt-4 rounded-3xl border border-dashed border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
              QRIS belum diatur. Hubungi owner MyArisan.
            </p>
          )}
          <div className="mt-4 rounded-3xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">Instruksi</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Bayar sesuai nominal, lalu upload bukti pembayaran paket. Paket
              aktif setelah dicek owner MyArisan.
            </p>
          </div>
        </GlassPanel>

        <GlassPanel>
          <h2 className="text-lg font-semibold text-foreground">
            Bukti Pembayaran Paket
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dibuat
              </p>
              <p className="mt-2 font-semibold text-foreground">
                {formatDateTimeLabel(invoice.createdAt)}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Aktif
              </p>
              <p className="mt-2 font-semibold text-foreground">
                {formatDateTimeLabel(invoice.paidAt)}
              </p>
            </div>
          </div>

          {invoice.status === "pending_verification" ? (
            <p className="mt-4 rounded-3xl border border-warning-border bg-warning-surface p-4 text-sm font-semibold leading-6 text-warning-foreground">
              Bukti pembayaran paket berhasil dikirim. Paket akan aktif setelah
              dicek admin MyArisan.
            </p>
          ) : null}
          {invoice.status === "paid" ? (
            <p className="mt-4 rounded-3xl border border-success-border bg-success-surface p-4 text-sm font-semibold leading-6 text-success-foreground">
              Paket sudah aktif sejak {formatDateTimeLabel(invoice.paidAt)}.
            </p>
          ) : null}

          {canUpload ? (
            <div className="mt-5">
              <InvoiceProofForm arisanId={arisanId} invoiceId={invoiceId} />
            </div>
          ) : null}

          {proofImageUrl ? (
            <div className="mt-5">
              <p className="text-sm font-semibold text-foreground">Bukti terkirim</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Bukti pembayaran paket"
                className="mt-3 max-h-[420px] w-full rounded-[1.25rem] border border-border object-contain"
                src={proofImageUrl}
              />
            </div>
          ) : null}
        </GlassPanel>
      </div>
    </>
  );
}

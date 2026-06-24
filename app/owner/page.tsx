import { desc, eq } from "drizzle-orm";

import {
  BrandLogo,
  ButtonLink,
  EmptyState,
  GlassPanel,
  MetricCard,
  PageShell,
  StatusBadge,
  buttonStyles,
} from "@/components/ui/app-ui";
import { db } from "@/db";
import { arisanGroups, invoices, plans, users } from "@/db/schema";
import { formatDateTimeLabel, formatRupiah } from "@/lib/arisan";
import { requireOwnerUser } from "@/lib/owner";

import { logoutAction } from "../app/actions";
import { approveInvoiceAction, rejectInvoiceAction } from "./actions";
import { ProofPreview } from "./proof-preview";

type OwnerInvoice = Awaited<ReturnType<typeof getOwnerInvoices>>[number];

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

async function getOwnerInvoices() {
  return db
    .select({
      adminName: users.name,
      adminPhone: users.phone,
      amount: invoices.amount,
      arisanName: arisanGroups.name,
      createdAt: invoices.createdAt,
      id: invoices.id,
      planName: plans.name,
      proofImageUrl: invoices.proofImageUrl,
      status: invoices.status,
    })
    .from(invoices)
    .innerJoin(users, eq(users.id, invoices.adminUserId))
    .innerJoin(arisanGroups, eq(arisanGroups.id, invoices.arisanGroupId))
    .innerJoin(plans, eq(plans.id, invoices.planId))
    .orderBy(desc(invoices.createdAt));
}

function InvoiceSection({
  accent = "neutral",
  emptyText,
  invoices,
  showActions = false,
  title,
}: {
  accent?: "amber" | "emerald" | "neutral" | "red";
  emptyText: string;
  invoices: OwnerInvoice[];
  showActions?: boolean;
  title: string;
}) {
  return (
    <GlassPanel>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
        <MetricCard accent={accent} label="Jumlah" value={invoices.length} />
      </div>
      {invoices.length === 0 ? (
        <p className="mt-4 rounded-3xl border border-dashed border-zinc-300 bg-white/35 p-4 text-sm leading-6 text-zinc-600">
          {emptyText}
        </p>
      ) : (
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {invoices.map((invoice) => {
            const proofUrl = invoice.proofImageUrl
              ? `/api/files/invoice-proof/${invoice.id}`
              : null;

            return (
              <article
                className="rounded-3xl border border-white/60 bg-white/45 p-4 shadow-sm backdrop-blur"
                key={invoice.id}
              >
                <div className="flex gap-4">
                  {proofUrl ? (
                    <ProofPreview
                      alt={`Bukti paket ${invoice.arisanName}`}
                      src={proofUrl}
                    />
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/35 text-xs font-semibold text-zinc-500">
                      Bukti
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-950">
                          {invoice.arisanName}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          {invoice.planName}
                        </p>
                      </div>
                      <StatusBadge status={invoiceStatusLabel(invoice.status)} />
                    </div>
                    <div className="mt-3 grid gap-1 text-sm leading-6 text-zinc-600">
                      <p>ID: {invoice.id}</p>
                      <p>
                        Admin: {invoice.adminName ?? "Admin"} ({invoice.adminPhone})
                      </p>
                      <p>Harga: {formatRupiah(invoice.amount)}</p>
                      <p>Dibuat: {formatDateTimeLabel(invoice.createdAt)}</p>
                    </div>
                  </div>
                </div>
                {showActions ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <form action={approveInvoiceAction.bind(null, invoice.id)}>
                      <button className={`${buttonStyles.primary} w-full`} type="submit">
                        Terima
                      </button>
                    </form>
                    <form action={rejectInvoiceAction.bind(null, invoice.id)}>
                      <button className={`${buttonStyles.danger} w-full`} type="submit">
                        Tolak
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}

export default async function OwnerPage() {
  const owner = await requireOwnerUser();

  if (owner.error || !owner.user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl">
          <GlassPanel variant="elevated">
            <BrandLogo />
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-950">
              Owner belum diatur
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{owner.error}</p>
            <ButtonLink className="mt-5" href="/app" variant="primary">
              Kembali
            </ButtonLink>
          </GlassPanel>
        </div>
      </PageShell>
    );
  }

  const invoiceRows = await getOwnerInvoices();
  const pendingInvoices = invoiceRows.filter((invoice) => invoice.status === "pending");
  const pendingVerificationInvoices = invoiceRows.filter(
    (invoice) => invoice.status === "pending_verification",
  );
  const paidInvoices = invoiceRows.filter((invoice) => invoice.status === "paid");
  const rejectedInvoices = invoiceRows.filter((invoice) => invoice.status === "rejected");

  return (
    <PageShell>
      <div className="space-y-5">
        <GlassPanel variant="elevated">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <BrandLogo />
              <p className="mt-6 text-sm font-semibold tracking-wide text-emerald-700">
                Owner
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950 lg:text-4xl">
                Paket MyArisan
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Login sebagai {owner.user.phone}. Cek bukti paket dan aktifkan
                paket arisan dari sini.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/app">Buka Aplikasi</ButtonLink>
              <form action={logoutAction}>
                <button className={buttonStyles.secondary}>Keluar</button>
              </form>
            </div>
          </div>
        </GlassPanel>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard accent="neutral" label="Belum Upload" value={pendingInvoices.length} />
          <MetricCard accent="amber" label="Menunggu Dicek" value={pendingVerificationInvoices.length} />
          <MetricCard accent="emerald" label="Sudah Dibayar" value={paidInvoices.length} />
          <MetricCard accent="red" label="Ditolak" value={rejectedInvoices.length} />
        </div>

        {invoiceRows.length === 0 ? (
          <EmptyState title="Belum ada tagihan paket">
            Tagihan paket akan muncul setelah admin memilih paket berbayar.
          </EmptyState>
        ) : (
          <div className="space-y-5">
            <InvoiceSection
              emptyText="Belum ada tagihan paket baru."
              invoices={pendingInvoices}
              title="Belum Upload Bukti"
            />
            <InvoiceSection
              accent="amber"
              emptyText="Belum ada bukti paket yang menunggu dicek."
              invoices={pendingVerificationInvoices}
              showActions
              title="Menunggu Dicek"
            />
            <InvoiceSection
              accent="emerald"
              emptyText="Belum ada tagihan paket dibayar."
              invoices={paidInvoices}
              title="Sudah Dibayar"
            />
            <InvoiceSection
              accent="red"
              emptyText="Belum ada tagihan paket ditolak."
              invoices={rejectedInvoices}
              title="Ditolak"
            />
          </div>
        )}
      </div>
    </PageShell>
  );
}

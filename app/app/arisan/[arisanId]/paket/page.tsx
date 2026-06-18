import { eq } from "drizzle-orm";

import {
  ButtonLink,
  EmptyState,
  GlassPanel,
  MetricCard,
  StatusBadge,
  cn,
  buttonStyles,
} from "@/components/ui/app-ui";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { db } from "@/db";
import { arisanGroups } from "@/db/schema";
import { formatDateTimeLabel, formatRupiah } from "@/lib/arisan";
import { requireArisanAdmin } from "@/lib/auth/user";
import { getPackageStatus, getPaidPlans } from "@/lib/subscription";

import { choosePackageAction } from "./actions";

function statusLabel(status: string) {
  if (status === "aktif") {
    return "Aktif";
  }

  if (status === "expired") {
    return "Expired";
  }

  return "Gratis";
}

function packageActionLabel(input: {
  currentPlanId: string;
  currentPrice: number;
  planId: string;
  planPrice: number;
  status: string;
}) {
  if (input.status === "gratis") {
    return "Pilih Paket";
  }

  if (input.currentPlanId === input.planId) {
    return "Perpanjang";
  }

  if (input.planPrice > input.currentPrice) {
    return "Upgrade";
  }

  return "Pilih Paket";
}

export default async function PaketPage({
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
          Hanya admin arisan yang bisa membuka halaman Paket.
        </EmptyState>
      </>
    );
  }

  const [[group], packageStatus, paidPlans] = await Promise.all([
    db
      .select({
        name: arisanGroups.name,
      })
      .from(arisanGroups)
      .where(eq(arisanGroups.id, arisanId))
      .limit(1),
    getPackageStatus(arisanId),
    getPaidPlans(),
  ]);

  return (
    <>
      <DashboardHeader
        actions={<ButtonLink href={`/app/arisan/${arisanId}`}>Kembali</ButtonLink>}
        eyebrow="Paket"
        subtitle="Atur batas anggota dan kuota baca bukti untuk arisan ini."
        title={group?.name ?? "Arisan"}
      />
      {packageStatus.isExpiredPaid ? (
        <GlassPanel className="border-amber-200/80 bg-amber-50/80">
          <p className="text-sm font-semibold leading-6 text-amber-950">
            Paket kamu sudah habis. Data tetap aman, tapi fitur bukti otomatis
            dikunci sampai paket diperpanjang.
          </p>
        </GlassPanel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Paket" value={packageStatus.currentPlan.name} />
        <MetricCard
          accent={packageStatus.status === "expired" ? "red" : "emerald"}
          label="Status"
          value={<StatusBadge status={statusLabel(packageStatus.status)} />}
        />
        <MetricCard
          accent="neutral"
          label="Aktif Sampai"
          value={formatDateTimeLabel(packageStatus.activeUntil)}
        />
        <MetricCard
          accent="amber"
          label="Baca Bukti"
          value={`${packageStatus.proofUsed}/${packageStatus.proofLimit}`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <GlassPanel>
          <h2 className="text-lg font-semibold text-zinc-950">Paket Saat Ini</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/60 bg-white/45 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Anggota
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-950">
                {packageStatus.memberUsed}/{packageStatus.memberLimit}
              </p>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/45 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Baca Bukti
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-950">
                {packageStatus.proofUsed}/{packageStatus.proofLimit}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            Paket berlaku per arisan. Pembayaran dilakukan manual lewat QRIS dan
            aktif setelah dicek owner MyArisan.
          </p>
        </GlassPanel>

        <GlassPanel variant="elevated">
          <h2 className="text-lg font-semibold text-zinc-950">Pilih Paket</h2>
          <div className="mt-4 grid gap-3">
            {paidPlans.map((plan) => {
              const isHighlighted = plan.id === "pro";

              return (
                <div
                  className={cn(
                    "rounded-3xl border border-white/60 bg-white/45 p-4 shadow-sm",
                    isHighlighted && "border-emerald-200 bg-emerald-50/70",
                  )}
                  key={plan.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-zinc-950">
                          {plan.name}
                        </h3>
                        {isHighlighted ? <StatusBadge status="Rekomendasi" /> : null}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">
                        {plan.maxMembers} anggota, {plan.monthlyProofLimit} bukti/bulan
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-950">
                      {formatRupiah(plan.price)}
                    </p>
                  </div>
                  <form action={choosePackageAction.bind(null, arisanId, plan.id)}>
                    <button
                      className={`${buttonStyles.primary} mt-4 w-full`}
                      type="submit"
                    >
                      {packageActionLabel({
                        currentPlanId: packageStatus.currentPlan.id,
                        currentPrice: packageStatus.currentPlan.price,
                        planId: plan.id,
                        planPrice: plan.price,
                        status: packageStatus.status,
                      })}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </GlassPanel>
      </div>
    </>
  );
}

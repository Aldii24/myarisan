import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ButtonLink, EmptyState, GlassPanel } from "@/components/ui/app-ui";
import { formatDateTimeLabel } from "@/lib/arisan";
import { getArisanSettings } from "@/lib/arisan-settings";
import { requireArisanAdmin } from "@/lib/auth/user";
import { getPackageStatus, isSubscriptionActive } from "@/lib/subscription";

import { DeleteArisan } from "./delete-arisan";
import { SettingsForm } from "./settings-form";

export default async function PengaturanPage({
  params,
}: {
  params: Promise<{ arisanId: string }>;
}) {
  const { arisanId } = await params;
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return (
      <>
        <DashboardHeader eyebrow="Tidak Bisa Akses" title="Hanya admin arisan" />
        <EmptyState
          action={
            <ButtonLink href={`/app/arisan/${arisanId}`} variant="primary">
              Kembali
            </ButtonLink>
          }
          title="Hanya admin"
        >
          Hanya admin arisan yang bisa mengubah pengaturan arisan.
        </EmptyState>
      </>
    );
  }

  const settings = await getArisanSettings(arisanId);
  const hasActivePackage = await isSubscriptionActive(arisanId);

  if (!settings) {
    return (
      <>
        <DashboardHeader eyebrow="Pengaturan" title="Arisan tidak ditemukan" />
        <EmptyState title="Tidak ada data">
          Buka kembali daftar arisan untuk memilih halaman yang tersedia.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        eyebrow="Pengaturan"
        subtitle="Ubah nama arisan, setoran, batas setor, dan rekening admin."
        title={settings.name}
      />
      <GlassPanel className="p-5" variant="elevated">
        <SettingsForm
          arisanId={arisanId}
          initialValues={{
            amountPerPeriod: settings.amountPerPeriod,
            bankAccountText: settings.bankAccountText,
            dueDay: settings.dueDay,
            name: settings.name,
          }}
          periodLabel={settings.periodType === "weekly" ? "Mingguan" : "Bulanan"}
        />
      </GlassPanel>
      {hasActivePackage ? (
        <ActivePackageNotice arisanId={arisanId} />
      ) : (
        <DeleteArisan arisanId={arisanId} arisanName={settings.name} />
      )}
    </>
  );
}

async function ActivePackageNotice({ arisanId }: { arisanId: string }) {
  const status = await getPackageStatus(arisanId);

  return (
    <div className="mt-6 rounded-3xl border border-warning-border bg-warning-surface p-5">
      <h2 className="text-base font-semibold text-warning-foreground">Paket Masih Aktif</h2>
      <p className="mt-1 text-sm text-warning-foreground">
        Arisan ini masih punya paket aktif sampai{" "}
        <span className="font-semibold">
          {formatDateTimeLabel(status.activeUntil)}
        </span>
        . Menghapus arisan akan membuang sisa paket yang sudah dibayar. Lebih
        baik buat periode baru untuk terus memakai paketnya.
      </p>
      <ButtonLink
        className="mt-4"
        href={`/app/arisan/${arisanId}/giliran`}
        variant="primary"
      >
        Buat periode baru
      </ButtonLink>
    </div>
  );
}

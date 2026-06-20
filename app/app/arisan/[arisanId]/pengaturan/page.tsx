import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ButtonLink, EmptyState, GlassPanel } from "@/components/ui/app-ui";
import { getArisanSettings } from "@/lib/arisan-settings";
import { requireArisanAdmin } from "@/lib/auth/user";

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
    </>
  );
}
